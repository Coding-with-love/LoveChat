import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { openai } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText, smoothStream } from "ai"
import { headers } from "next/headers"
import { getModelConfig, type AIModel } from "@/lib/models"
import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"
import { CustomResumableStream } from "@/lib/resumable-streams-server" // Declare the CustomResumableStream variable

export const runtime = "nodejs"
export const maxDuration = 60

// GET handler for resuming streams
export async function GET(request: Request) {
  console.log("🔄 Resume stream request received")

  const { searchParams } = new URL(request.url)
  const threadId = searchParams.get("chatId") || searchParams.get("threadId")

  if (!threadId) {
    return new Response("Thread ID is required", { status: 400 })
  }

  try {
    // Get the most recent active stream for this thread
    const activeStreams = await CustomResumableStream.getActiveStreamsForThread(threadId)

    if (activeStreams.length === 0) {
      console.log("No active streams found for thread:", threadId)
      return new Response("No active streams found", { status: 404 })
    }

    const recentStreamId = activeStreams[0]
    console.log("🔄 Attempting to resume stream:", recentStreamId)

    // Try to resume the stream
    const resumedStream = await CustomResumableStream.resume(recentStreamId)

    if (resumedStream) {
      console.log("✅ Successfully resumed stream")
      return new Response(resumedStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    return new Response("Unable to resume stream", { status: 404 })
  } catch (error) {
    console.error("Error in GET handler:", error)
    return new Response("Internal server error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  console.log("🚀 Chat API called")

  try {
    // Parse request body safely
    let json
    try {
      json = await req.json()
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { messages, model, webSearchEnabled, apiKey: bodyApiKey, data } = json
    const headersList = await headers()

    console.log("📨 Received messages:", messages?.length || 0)
    console.log("🤖 Using model:", model)

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      console.error("❌ Invalid messages format")
      return NextResponse.json({ error: "Messages must be an array" }, { status: 400 })
    }

    if (!model) {
      console.error("❌ Model not specified")
      return NextResponse.json({ error: "Model is required" }, { status: 400 })
    }

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

    const modelConfig = getModelConfig(model as AIModel)
    console.log("🧠 Model config:", modelConfig.provider)

    // Get API key
    let apiKey: string | null = bodyApiKey || null

    if (!apiKey) {
      const headerKey = modelConfig.headerKey
      apiKey = headersList.get(headerKey)
    }

    if (!apiKey) {
      const alternativeHeaders = [
        "x-google-api-key",
        "google-api-key",
        "x-api-key",
        "x-openai-api-key",
        "openai-api-key",
        "x-openrouter-api-key",
        "openrouter-api-key",
      ]

      for (const header of alternativeHeaders) {
        apiKey = headersList.get(header)
        if (apiKey) break
      }
    }

    if (!apiKey) {
      console.log("❌ Missing API key for provider:", modelConfig.provider)
      return NextResponse.json({ error: `${modelConfig.provider} API key is required` }, { status: 400 })
    }

    console.log("✅ API key found, length:", apiKey.length)

    // Create AI model
    let aiModel
    let modelSupportsSearch = false

    switch (modelConfig.provider) {
      case "google":
        const google = createGoogleGenerativeAI({ apiKey })
        if (webSearchEnabled && modelConfig.supportsSearch) {
          aiModel = google(modelConfig.modelId, { useSearchGrounding: true })
          modelSupportsSearch = true
        } else {
          aiModel = google(modelConfig.modelId)
        }
        break

      case "openai":
        aiModel = openai("gpt-4o")
        break

      case "openrouter":
        const openrouter = createOpenRouter({ apiKey })
        aiModel = openrouter(modelConfig.modelId)
        break

      default:
        return NextResponse.json({ error: "Unsupported model provider" }, { status: 400 })
    }

    const threadId = req.nextUrl.searchParams.get("threadId")
    const aiMessageId = uuidv4()

    // Process messages - create AI-specific content with file data
    const processedMessages = []

    for (const msg of messages) {
      console.log(`🔄 Processing message role: ${msg.role}`)

      // Start with a clean message structure
      const cleanMessage = {
        role: msg.role,
        content: "",
      }

      // Get the base content (user's actual message text)
      let messageContent = typeof msg.content === "string" ? msg.content : ""

      // Handle file attachments if present - add file content for AI processing only
      if (msg.parts) {
        const fileAttachmentPart = msg.parts.find((part: any) => part.type === "file_attachments")

        if (fileAttachmentPart?.attachments) {
          console.log("📎 Found file attachments:", fileAttachmentPart.attachments.length)

          // Add file information for the AI to process
          if (messageContent) {
            messageContent += "\n\n"
          }
          messageContent +=
            "[SYSTEM: The user has shared the following files with you. Analyze them to answer their question.]\n\n"

          for (const attachment of fileAttachmentPart.attachments) {
            console.log("📄 Processing attachment:", attachment.fileName)

            messageContent += `**File: ${attachment.fileName}** (${attachment.fileType})\n`

            // Add file content if available
            if (attachment.content) {
              console.log("📝 Adding file content for AI processing")
              const fileExtension = attachment.fileName.split(".").pop() || ""
              messageContent += `\`\`\`${fileExtension}\n${attachment.content}\n\`\`\`\n\n`
            } else if (attachment.extractedText) {
              console.log("📝 Adding extracted text for AI processing")
              messageContent += `${attachment.extractedText}\n\n`
            } else {
              console.log("⚠️ No content available for:", attachment.fileName)
              messageContent += `(File content not available)\n\n`
            }
          }

          messageContent += "[END OF FILES]\n"
        }
      }

      // Set the final content for AI processing
      cleanMessage.content = messageContent || ""

      processedMessages.push(cleanMessage)
    }

    console.log("📨 Processed messages for AI:", processedMessages.length)

    // Create system prompt
    const systemPrompt = getSystemPrompt(webSearchEnabled, modelSupportsSearch, user.email)

    // Create stream options with clean message format
    const streamOptions = {
      model: aiModel,
      messages: processedMessages,
      system: systemPrompt,
      experimental_transform: [smoothStream({ chunking: "word" })],
      onFinish: async ({ text, finishReason, usage, sources, providerMetadata }) => {
        console.log("🏁 AI generation finished")
        await handleMessageSave(threadId, aiMessageId, user.id, text, sources, providerMetadata, modelConfig, apiKey)
      },
    }

    console.log("🚀 Starting AI generation...")
    const result = streamText(streamOptions)
    const responseStream = result.toDataStream()

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("💥 Unhandled Chat API error:", error)
    console.error("💥 Error stack:", error?.stack)

    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error?.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// Helper function to get system prompt
function getSystemPrompt(webSearchEnabled: boolean, modelSupportsSearch: boolean, userEmail: string) {
  return `You are LoveChat, an AI assistant that can answer questions and help with tasks.
Be helpful and provide relevant information.
Be respectful and polite in all interactions.
Be engaging and maintain a conversational tone.

${
  webSearchEnabled && modelSupportsSearch
    ? `
🔍 IMPORTANT: You have access to real-time web search capabilities.
When you use web search, start your response with "📊 Web Search Results:" to indicate you're using real-time data.
`
    : ""
}

CRITICAL: You can now see and analyze files that users share:
- When you see [SYSTEM: The user has shared the following files...], this means the user has uploaded files for you to analyze
- The file content will be provided between the system markers
- Always acknowledge that you can see/read the files and provide detailed analysis
- Be specific about what you observe in the files
- Answer the user's question based on the file content

When you receive files:
1. Immediately acknowledge you can see them: "I can see the file(s) you've shared: [filename(s)]"
2. Provide detailed analysis of the content
3. Answer any questions about the files
4. Focus on the user's question while referencing the file content

FORMATTING CAPABILITIES:
You can use rich markdown formatting in your responses:
- **Bold text** and *italic text*
- \`inline code\` for short code snippets
- Code blocks with syntax highlighting:
  \`\`\`javascript
  console.log("Hello World");
  \`\`\`
- Lists (bulleted and numbered)
- Headers (# ## ###)
- Tables using markdown syntax
- Blockquotes using >
- Links [text](url)
- Horizontal rules using ---

For code-related questions:
- Always use appropriate syntax highlighting in code blocks
- Explain code step by step when helpful
- Provide working examples when possible
- Use inline code formatting for variable names, functions, etc.

For technical explanations:
- Use headers to organize complex topics
- Use lists to break down steps or concepts
- Use code blocks for any code examples
- Use tables when comparing features or options

Current user: ${userEmail}`
}

// Helper function to handle message saving
async function handleMessageSave(
  threadId: string | null,
  aiMessageId: string,
  userId: string,
  text: string,
  sources: any,
  providerMetadata: any,
  modelConfig: any,
  apiKey: string,
) {
  try {
    console.log("💾 Saving AI message...")

    if (threadId && text) {
      const messageParts = [{ type: "text", text }]

      if (sources && sources.length > 0) {
        messageParts.push({ type: "sources", sources } as any)
      }

      const aiMessage = {
        id: aiMessageId,
        thread_id: threadId,
        user_id: userId,
        parts: messageParts,
        content: text,
        role: "assistant" as const,
        created_at: new Date().toISOString(),
      }

      const { error } = await supabaseServer
        .from("messages")
        .upsert(aiMessage, { onConflict: "id", ignoreDuplicates: false })

      if (error) {
        console.error("❌ Failed to save AI message:", error)
      } else {
        console.log("✅ AI message saved successfully")
      }

      // Update thread timestamp
      await supabaseServer
        .from("threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", threadId)
        .eq("user_id", userId)
    }
  } catch (error) {
    console.error("💥 Error saving message:", error)
  }
}

// Handler for Ollama models
async function handleOllamaChat(req: NextRequest, messages: any[], model: string, headersList: Headers) {
  try {
    const ollamaBaseUrl = headersList.get("x-ollama-base-url") || "http://localhost:11434"
    const actualModel = model.replace("ollama:", "")

    console.log(`🦙 Handling Ollama chat with model: ${actualModel}`)

    // Process messages for Ollama - also clean format
    const ollamaMessages = messages.map((msg: any) => {
      let content = typeof msg.content === "string" ? msg.content : ""

      // Handle file attachments for Ollama too
      if (msg.parts) {
        const fileAttachmentPart = msg.parts.find((part: any) => part.type === "file_attachments")
        if (fileAttachmentPart?.attachments) {
          if (content) content += "\n\n"
          content += "[SYSTEM: Files shared by user]\n\n"

          for (const attachment of fileAttachmentPart.attachments) {
            content += `**File: ${attachment.fileName}**\n`
            if (attachment.content) {
              const fileExtension = attachment.fileName.split(".").pop() || ""
              content += `\`\`\`${fileExtension}\n${attachment.content}\n\`\`\`\n\n`
            }
          }
          content += "[END OF FILES]\n"
        }
      }

      return {
        role: msg.role,
        content: content,
      }
    })

    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: actualModel,
        messages: ollamaMessages,
        stream: true,
        options: { temperature: 0.7 },
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Ollama API error: ${response.statusText}` }, { status: response.status })
    }

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
                  controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(data.message.content)}\n`))
                }
              } catch (parseError) {
                console.error("Error parsing Ollama response:", parseError)
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
