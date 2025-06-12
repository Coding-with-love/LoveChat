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

    const threadId = req.nextUrl.searchParams.get("threadId") as string
    const aiMessageId = uuidv4()

    // Get thread persona if one is assigned
    let threadPersona = null
    if (threadId) {
      try {
        console.log("🎭 Looking up persona for thread:", threadId)
        
        const { data: threadPersonaData, error: personaError } = await supabaseServer
          .from("thread_personas")
          .select(`
            *,
            personas (
              id,
              name,
              description,
              system_prompt,
              avatar_emoji,
              color,
              is_default,
              is_public
            )
          `)
          .eq("thread_id", threadId)
          .eq("user_id", user.id)
          .single()

        if (!personaError && threadPersonaData?.personas) {
          threadPersona = threadPersonaData.personas
          console.log("✅ Found persona for thread:", threadPersona.name)
        } else {
          console.log("ℹ️ No persona assigned to thread")
        }
      } catch (error) {
        console.log("⚠️ Error looking up persona:", error)
      }
    }

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

    // Create system prompt with persona integration
    const systemPrompt = getSystemPrompt(webSearchEnabled, modelSupportsSearch, user.email, threadPersona)

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

// Helper function to get system prompt with persona integration
function getSystemPrompt(
  webSearchEnabled: boolean,
  modelSupportsSearch: boolean,
  userEmail: string,
  persona: any = null,
) {
  let basePrompt = `You are LoveChat, an AI assistant that can answer questions and help with tasks.
Be helpful and provide relevant information.
Be respectful and polite in all interactions.
Be engaging and maintain a conversational tone.`

  // If a persona is active, replace the base prompt with the persona's system prompt
  if (persona && persona.system_prompt) {
    console.log("🎭 Using persona system prompt:", persona.name)
    basePrompt = persona.system_prompt
  }

  return `${basePrompt}

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

MATHEMATICAL NOTATION:
For mathematical expressions, use LaTeX notation:
- For inline math, use single dollar signs: $x^2 + y^2 = z^2$
- For display math (centered on its own line), use double dollar signs: $$\\int_0^1 x^2 dx$$
- Escape backslashes in LaTeX commands: \\alpha instead of \alpha
- For complex equations, prefer display math
- Examples:
  - Inline fraction: $\\frac{a}{b}$
  - Display fraction: $$\\frac{a}{b}$$
  - Inline integral: $\\int_a^b f(x) dx$
  - Display integral: $$\\int_a^b f(x) dx$$
  - Inline summation: $\\sum_{i=1}^n i^2$
  - Display summation: $$\\sum_{i=1}^n i^2$$
  - Inline limit: $\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$
  - Display limit: $$\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$$
  - Display matrix: $$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$$

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
    console.error("💥 Error saving AI message:", error)
  }
}

// Ollama handler function
async function handleOllamaChat(req: NextRequest, messages: any[], model: string, headersList: Headers) {
  try {
    console.log("🦙 Handling Ollama chat request")

    const ollamaModel = model.replace("ollama:", "")
    console.log("🦙 Using Ollama model:", ollamaModel)

    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434"
    console.log("🦙 Ollama URL:", ollamaUrl)

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      console.error("❌ Ollama API error:", response.status, response.statusText)
      return NextResponse.json({ error: "Ollama API error" }, { status: response.status })
    }

    console.log("✅ Ollama response received, streaming...")

    // Create a readable stream from the Ollama response
    const stream = new ReadableStream({
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

            // Parse the Ollama response chunks
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n").filter((line) => line.trim())

            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                if (data.message?.content) {
                  // Format as AI SDK compatible stream
                  const streamChunk = `0:"${data.message.content.replace(/"/g, '\\"')}"\n`
                  controller.enqueue(new TextEncoder().encode(streamChunk))
                }
                if (data.done) {
                  controller.enqueue(new TextEncoder().encode('d:""\n'))
                }
              } catch (parseError) {
                console.warn("⚠️ Failed to parse Ollama chunk:", parseError)
              }
            }
          }
        } catch (error) {
          console.error("❌ Error reading Ollama stream:", error)
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("💥 Ollama handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
