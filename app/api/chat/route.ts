import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText, smoothStream, generateText } from "ai"
import { headers } from "next/headers"
import { getModelConfig, type AIModel } from "@/lib/models"
import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"

// Import the resumable streams functions at the top
import {
  createResumableStreamServer,
  updateResumableStreamServer,
  estimateCompletion,
} from "@/lib/supabase/resumable-streams"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  console.log("🚀 Chat API called")

  try {
    const { messages, model, webSearchEnabled } = await req.json()
    const headersList = await headers()

    // Check if this is an Ollama model
    if (model.startsWith("ollama:")) {
      console.log("🦙 Ollama model detected, routing to Ollama handler")
      return handleOllamaChat(req, messages, model, headersList)
    }

    // Get authorization header
    const authHeader = headersList.get("authorization")
    console.log("📋 Auth header present:", !!authHeader)

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ Missing or invalid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log("🎫 Token extracted, length:", token.length)

    // Verify token
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      console.log("❌ Auth error:", authError?.message || "No user found")
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)
    console.log("🔍 Web search enabled:", webSearchEnabled)

    // After the user authentication section, add this debugging:
    console.log("🟠 [CHAT API DEBUG] Starting resumable stream creation process")
    console.log("🟠 [CHAT API DEBUG] Thread ID from query params:", req.nextUrl.searchParams.get("threadId"))
    console.log("🟠 [CHAT API DEBUG] Messages received:", messages?.length || 0)

    const modelConfig = getModelConfig(model as AIModel)
    const apiKey = headersList.get(modelConfig.headerKey) as string

    if (!apiKey) {
      console.log("Missing API key for provider:", modelConfig.provider)
      return NextResponse.json({ error: `${modelConfig.provider} API key is required` }, { status: 400 })
    }

    let aiModel
    let modelSupportsSearch = false

    // Create resumable stream for tracking - do this early
    const threadId = req.nextUrl.searchParams.get("threadId")
    let resumableStreamId: string | null = null
    let aiMessageId: string | null = null

    if (threadId) {
      try {
        const lastMessage = messages[messages.length - 1]
        console.log("🟠 [CHAT API DEBUG] Last message:", lastMessage)

        if (lastMessage?.role === "user") {
          // Try to get the AI message ID from headers (sent by client)
          const clientMessageId = headersList.get("x-ai-message-id")
          aiMessageId = clientMessageId || uuidv4()

          console.log("🟠 [CHAT API DEBUG] AI message ID:", aiMessageId)
          console.log("🟠 [CHAT API DEBUG] From client header:", !!clientMessageId)
          console.log("🟠 [CHAT API DEBUG] User ID:", user.id)
          console.log("🟠 [CHAT API DEBUG] Model:", model)
          console.log("🟠 [CHAT API DEBUG] Last message content length:", lastMessage.content?.length || 0)

          console.log("🟠 [CHAT API DEBUG] Calling createResumableStreamServer...")

          const resumableStream = await createResumableStreamServer(
            threadId,
            aiMessageId,
            user.id,
            model as AIModel,
            modelConfig,
            lastMessage.content,
          )

          resumableStreamId = resumableStream.id
          console.log("🟠 [CHAT API DEBUG] Created resumable stream successfully!")
          console.log("🟠 [CHAT API DEBUG] Resumable stream ID:", resumableStreamId)
          console.log("🟠 [CHAT API DEBUG] Resumable stream data:", resumableStream)
        } else {
          console.log("🟠 [CHAT API DEBUG] Last message is not from user, skipping stream creation")
        }
      } catch (error) {
        console.error("🟠 [CHAT API DEBUG] Failed to create resumable stream:", error)
        console.error("🟠 [CHAT API DEBUG] Error details:", error)
        // Don't fail the request if stream creation fails
      }
    } else {
      console.log("🟠 [CHAT API DEBUG] No thread ID provided, skipping stream creation")
    }

    console.log("🟠 [CHAT API DEBUG] Final resumable stream ID:", resumableStreamId)
    console.log("🟠 [CHAT API DEBUG] Final AI message ID:", aiMessageId)

    switch (modelConfig.provider) {
      case "google":
        const google = createGoogleGenerativeAI({ apiKey })

        // Configure search grounding for supported models
        if (webSearchEnabled && modelConfig.supportsSearch) {
          console.log(`🔍 Configuring Google model with search grounding`)

          // Use the AI SDK's built-in search grounding
          aiModel = google(modelConfig.modelId, {
            useSearchGrounding: true,
          })

          modelSupportsSearch = true
          console.log("✅ Search grounding enabled with AI SDK")
        } else {
          console.log("🔍 Using Google model without search grounding")
          aiModel = google(modelConfig.modelId)
        }
        break

      case "openai":
        const openai = createOpenAI({ apiKey })
        // OpenAI models don't have native search grounding
        aiModel = openai(modelConfig.modelId)
        if (webSearchEnabled) {
          console.log("⚠️ OpenAI model doesn't support native search grounding")
        }
        break

      case "openrouter":
        const openrouter = createOpenRouter({ apiKey })
        aiModel = openrouter(modelConfig.modelId)
        if (webSearchEnabled) {
          console.log("⚠️ OpenRouter model search support varies by model")
        }
        break

      default:
        return NextResponse.json({ error: "Unsupported model provider" }, { status: 400 })
    }

    console.log("🧵 Thread ID:", threadId)

    // Process messages to handle file attachments
    const processedMessages = messages.map((msg: any) => {
      // Create a copy of the message
      const newMsg = { ...msg }

      // Check if the message has file attachments
      const fileAttachmentPart = msg.parts?.find((part: any) => part.type === "file_attachments")

      if (fileAttachmentPart) {
        // Extract file information for the AI
        const fileInfo = fileAttachmentPart.attachments.map((attachment: any) => {
          return {
            name: attachment.fileName,
            type: attachment.fileType,
            size: attachment.fileSize,
          }
        })

        // Add file information to the message content
        if (fileInfo.length > 0) {
          // Create a more detailed description of the files
          const fileDescription = fileInfo
            .map((file: any) => {
              const extension = file.name.split(".").pop()?.toUpperCase() || "FILE"
              const sizeFormatted =
                file.size < 1024
                  ? `${file.size} B`
                  : file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
              return `[${extension} File: ${file.name}, Size: ${sizeFormatted}]`
            })
            .join("\n")

          // If the message already has content, append the file description
          if (newMsg.content) {
            newMsg.content += `\n\nAttached files:\n${fileDescription}`
          } else {
            newMsg.content = `Attached files:\n${fileDescription}`
          }
        }

        // Filter out the file_attachments part
        newMsg.parts = msg.parts.filter((part: any) => part.type !== "file_attachments")
      }

      return newMsg
    })

    const result = streamText({
      model: aiModel,
      messages: processedMessages,
      onError: async (error) => {
        console.log("AI model error:", error)
        if (resumableStreamId) {
          try {
            await updateResumableStreamServer(resumableStreamId, {
              status: "failed",
            })
          } catch (updateError) {
            console.error("Failed to mark stream as failed:", updateError)
          }
        }
      },
      onFinish: async ({ text, finishReason, usage, sources, providerMetadata }) => {
        try {
          console.log("🏁 AI generation finished, saving message...")
          console.log("📝 Generated text length:", text.length)
          console.log("🔍 Sources available:", !!sources && sources.length > 0)
          console.log("🧵 Saving to thread:", threadId)

          if (threadId && text && aiMessageId) {
            console.log("💾 Creating AI message with pre-generated ID:", aiMessageId)

            // Include sources in the message parts if available
            const messageParts = [{ type: "text", text }]

            // Add sources if available
            if (sources && sources.length > 0) {
              messageParts.push({
                type: "sources",
                sources,
              })
            }

            // Add provider metadata if available
            if (providerMetadata) {
              // For Google models, extract grounding metadata
              if (providerMetadata.google?.groundingMetadata) {
                messageParts.push({
                  type: "grounding_metadata",
                  metadata: providerMetadata.google.groundingMetadata,
                })
              }
            }

            const aiMessage = {
              id: aiMessageId,
              thread_id: threadId,
              user_id: user.id,
              parts: messageParts,
              content: text,
              role: "assistant" as const,
              created_at: new Date().toISOString(),
            }

            // Save the AI message
            const { error, data } = await supabaseServer
              .from("messages")
              .upsert(aiMessage, {
                onConflict: "id",
                ignoreDuplicates: false,
              })
              .select()

            if (error) {
              console.error("❌ Failed to save AI message:", error)
            } else {
              console.log("✅ AI message saved successfully:", data?.[0]?.id)

              // Generate summary for AI response
              try {
                console.log("📝 Generating summary for AI response...")

                // Create a summary model for generating summaries
                const summaryModel =
                  modelConfig.provider === "google" ? createGoogleGenerativeAI({ apiKey })("gemini-1.5-flash") : aiModel

                const { text: summary } = await generateText({
                  model: summaryModel,
                  system: `
              - You will generate a brief summary of the AI assistant's response for navigation purposes
              - Keep it under 50 characters
              - Focus on the main topic or key information provided
              - Do not use quotes or special characters
              - Make it descriptive and useful for navigation
              `,
                  prompt: text.slice(0, 1000), // Limit prompt length
                })

                // Save the summary
                const { error: summaryError } = await supabaseServer.from("message_summaries").insert({
                  thread_id: threadId,
                  message_id: aiMessageId,
                  user_id: user.id,
                  content: summary,
                })

                if (summaryError) {
                  console.error("❌ Failed to create AI message summary:", summaryError)
                } else {
                  console.log("✅ AI message summary created:", summary)
                }
              } catch (summaryError) {
                console.error("❌ Failed to generate AI message summary:", summaryError)
                // Don't fail the whole request if summary generation fails
              }
            }

            // In the onFinish handler, add this after saving the AI message:
            if (resumableStreamId) {
              try {
                await updateResumableStreamServer(resumableStreamId, {
                  status: "completed",
                  partial_content: text,
                  estimated_completion: 1.0,
                  completed_at: new Date().toISOString(),
                  total_tokens: usage?.totalTokens || 0,
                })
                console.log("✅ Marked resumable stream as completed")
              } catch (error) {
                console.error("Failed to update resumable stream:", error)
              }
            }

            // Update thread's last_message_at
            const { error: updateError } = await supabaseServer
              .from("threads")
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", threadId)
              .eq("user_id", user.id)

            if (updateError) {
              console.error("❌ Failed to update thread:", updateError)
            } else {
              console.log("✅ Thread updated successfully")
            }
          } else {
            console.log("⚠️ No thread ID or text, skipping save")
          }
        } catch (error) {
          console.error("💥 Error in onFinish:", error)
        }
      },
      system: `
You are SynapseChat, an AI assistant that can answer questions and help with tasks.
Be helpful and provide relevant information.
Be respectful and polite in all interactions.
Be engaging and maintain a conversational tone.

${
  webSearchEnabled && modelSupportsSearch
    ? `
🔍 IMPORTANT: You have access to real-time web search capabilities.

When you use web search to answer a question:
1. ALWAYS start your response with "📊 Web Search Results:" to clearly indicate you're using real-time data
2. Then continue with phrases like:
   - "Based on my search of the web..."
   - "According to current information online..."
   - "I found the following information from the web..."

3. Provide accurate, up-to-date information from your search results
4. Include specific data like prices, dates, percentages, and other relevant details
5. Present the information in a natural, conversational way
6. The sources will be automatically displayed below your response

Examples of good responses:

For stock prices:
"📊 Web Search Results:
Based on my search of the web, Tesla (TSLA) is currently trading at $248.50, up $12.30 (+5.2%) from yesterday's close. The market is currently open."

For news:
"📊 Web Search Results:
According to current information online, the latest news about this topic is..."

For weather:
"📊 Web Search Results:
I searched for current weather conditions in your area. The temperature is currently..."

ALWAYS start with "📊 Web Search Results:" when you use web search!
`
    : webSearchEnabled && !modelSupportsSearch
      ? `
NOTE: Web search is enabled but this model doesn't have native search capabilities.
- Acknowledge when users ask for current information that you cannot access
- Suggest they try with a model that supports web search (like Gemini 2.0 or Gemini 1.5)
- Provide the best information you can from your training data
`
      : ""
}

When users share files:
- For images: Acknowledge them but explain you cannot see their contents
- For documents (PDF, Word, etc.): Acknowledge them but explain you cannot read their contents
- For code files: Acknowledge them and offer to help with coding questions if they describe the content
- For data files (CSV, JSON, etc.): Acknowledge them and offer to help with data analysis if they describe the content
- For any other files: Acknowledge them and ask how you can help with the file
- Always suggest that users describe the file contents if they want you to comment on them

Always use LaTeX for mathematical expressions - 
Inline math must be wrapped in single dollar signs: $content$
Display math must be wrapped in double dollar signs: $$content$$
Display math should be placed on its own line, with nothing else on that line.
Do not nest math delimiters or mix styles.
Examples:
- Inline: The equation $E = mc^2$ shows mass-energy equivalence.
- Display: 
$$\\frac{d}{dx}\\sin(x) = \\cos(x)$$

Current user: ${user.email}
`,
      experimental_transform: [smoothStream({ chunking: "word" })],
      abortSignal: req.signal,
      // In the streamText call, update the onChunk handler:
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta" && resumableStreamId) {
          try {
            // Update stream progress
            const currentContent = (chunk as any).text || ""
            const estimatedProgress = estimateCompletion(currentContent)

            await updateResumableStreamServer(resumableStreamId, {
              partial_content: currentContent,
              estimated_completion: estimatedProgress,
            })
          } catch (error) {
            console.error("Failed to update stream progress:", error)
          }
        }
      },
    })

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error) => {
        return (error as { message: string }).message
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// Handler for Ollama models
async function handleOllamaChat(req: NextRequest, messages: any[], model: string, headersList: Headers) {
  try {
    // Get Ollama configuration from headers or use defaults
    const ollamaBaseUrl = headersList.get("x-ollama-base-url") || "http://localhost:11434"
    const actualModel = model.replace("ollama:", "")

    console.log(`🦙 Handling Ollama chat with model: ${actualModel} at ${ollamaBaseUrl}`)

    // Format messages for Ollama API
    const ollamaMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: actualModel,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: 0.7,
        },
      }),
    })

    if (!response.ok) {
      console.error(`Ollama API error: ${response.statusText}`)
      return NextResponse.json({ error: `Ollama API error: ${response.statusText}` }, { status: response.status })
    }

    // Create a readable stream that transforms Ollama's format to match AI SDK format
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const text = new TextDecoder().decode(value)
            const lines = text.split("\n").filter(Boolean)

            for (const line of lines) {
              try {
                const data = JSON.parse(line)

                if (data.done) {
                  controller.enqueue(new TextEncoder().encode(`0:""\n`))
                } else if (data.message?.content) {
                  // Format as AI SDK text delta
                  controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(data.message.content)}\n`))
                }
              } catch (parseError) {
                console.error("Error parsing Ollama response line:", parseError)
              }
            }
          }
        } catch (error) {
          console.error("Error reading Ollama stream:", error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Error in Ollama chat handler:", error)
    return NextResponse.json({ error: "Failed to process Ollama chat request" }, { status: 500 })
  }
}
