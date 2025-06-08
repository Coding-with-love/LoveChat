import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { supabaseServer } from "@/lib/supabase/server"
import { getResumableStreamByIdServer, updateResumableStreamServer } from "@/lib/supabase/resumable-streams"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText, smoothStream } from "ai"
import { getModelConfig, type AIModel } from "@/lib/models"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  console.log("🔄 Resume stream API called")

  try {
    const { streamId } = await req.json()
    const headersList = await headers()

    // Get authorization header
    const authHeader = headersList.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify token
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // Get the resumable stream
    const stream = await getResumableStreamByIdServer(streamId)

    if (stream.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (stream.status !== "paused") {
      return NextResponse.json({ error: "Stream is not resumable" }, { status: 400 })
    }

    // Get the model configuration
    const modelConfig = getModelConfig(stream.model as AIModel)
    const apiKey = headersList.get(modelConfig.headerKey) as string

    if (!apiKey) {
      return NextResponse.json({ error: `${modelConfig.provider} API key is required` }, { status: 400 })
    }

    // Create the AI model
    let aiModel
    switch (modelConfig.provider) {
      case "google":
        const google = createGoogleGenerativeAI({ apiKey })
        aiModel = google(modelConfig.modelId)
        break
      case "openai":
        const openai = createOpenAI({ apiKey })
        aiModel = openai(modelConfig.modelId)
        break
      case "openrouter":
        const openrouter = createOpenRouter({ apiKey })
        aiModel = openrouter(modelConfig.modelId)
        break
      default:
        return NextResponse.json({ error: "Unsupported model provider" }, { status: 400 })
    }

    // Update stream status to streaming
    await updateResumableStreamServer(streamId, {
      status: "streaming",
      last_updated_at: new Date().toISOString(),
    })

    // Create continuation prompt
    const continuationPrompt =
      stream.continuation_prompt ||
      `Please continue from where you left off. Here's what you had written so far:\n\n${stream.partial_content}\n\nPlease continue naturally from this point.`

    // Get the original message to understand context
    const { data: originalMessage } = await supabaseServer
      .from("messages")
      .select("*")
      .eq("id", stream.message_id)
      .single()

    if (!originalMessage) {
      return NextResponse.json({ error: "Original message not found" }, { status: 404 })
    }

    // Get thread messages for context
    const { data: threadMessages } = await supabaseServer
      .from("messages")
      .select("*")
      .eq("thread_id", stream.thread_id)
      .order("created_at", { ascending: true })

    // Build context messages
    const contextMessages = (threadMessages || []).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Add continuation instruction
    contextMessages.push({
      role: "user",
      content: continuationPrompt,
    })

    const result = streamText({
      model: aiModel,
      messages: contextMessages,
      system: `
You are continuing a previous response that was interrupted. 
The user has provided the partial content you had generated so far.
Please continue naturally from where you left off, maintaining the same tone and context.
Do not repeat what was already written, just continue seamlessly.
`,
      experimental_transform: [smoothStream({ chunking: "word" })],
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          // Update the stream with new content
          try {
            const updatedContent = stream.partial_content + chunk.text
            const estimatedCompletion = Math.min(updatedContent.length / 1000, 0.95) // Rough estimate

            await updateResumableStreamServer(streamId, {
              partial_content: updatedContent,
              estimated_completion: estimatedCompletion,
            })
          } catch (error) {
            console.error("Failed to update stream progress:", error)
          }
        }
      },
      onFinish: async ({ text, finishReason, usage }) => {
        try {
          console.log("🏁 Stream continuation finished")

          const finalContent = stream.partial_content + text

          // Update the original message with the complete content
          await supabaseServer
            .from("messages")
            .update({
              content: finalContent,
              parts: [{ type: "text", text: finalContent }],
            })
            .eq("id", stream.message_id)

          // Mark stream as completed
          await updateResumableStreamServer(streamId, {
            status: "completed",
            partial_content: finalContent,
            estimated_completion: 1.0,
            completed_at: new Date().toISOString(),
            total_tokens: (stream.total_tokens || 0) + (usage?.totalTokens || 0),
          })

          console.log("✅ Stream resumption completed successfully")
        } catch (error) {
          console.error("❌ Error completing stream resumption:", error)
          await updateResumableStreamServer(streamId, {
            status: "failed",
          })
        }
      },
      onError: async (error) => {
        console.error("Stream resumption error:", error)
        await updateResumableStreamServer(streamId, {
          status: "failed",
        })
      },
      abortSignal: req.signal,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Resume stream API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
