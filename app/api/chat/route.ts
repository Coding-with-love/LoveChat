import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { openai } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText } from "ai"
import { headers } from "next/headers"
import { getModelConfig, type AIModel } from "@/lib/models"
import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"
import { CustomResumableStream } from "@/lib/resumable-streams-server"
import { StreamProtection, StreamCircuitBreaker } from "@/lib/stream-protection"

// Artifact creation utilities
interface ArtifactCandidate {
  type: "code" | "document" | "data"
  title: string
  content: string
  language?: string
  fileExtension?: string
  description?: string
}

function extractArtifacts(content: string, messageId: string): ArtifactCandidate[] {
  const artifacts: ArtifactCandidate[] = []

  // Extract code blocks
  const codeBlockRegex = /\`\`\`(\w+)?\n([\s\S]*?)\`\`\`/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || "text"
    const code = match[2].trim()

    // Only create artifacts for substantial code blocks (more than 3 lines or 100 characters)
    if (code.split("\n").length > 3 || code.length > 100) {
      const fileExtension = getFileExtension(language)
      const title = generateCodeTitle(code, language)

      artifacts.push({
        type: "code",
        title,
        content: code,
        language,
        fileExtension,
        description: `Generated ${language} code`,
      })
    }
  }

  // Extract structured documents (markdown with headers, lists, etc.)
  if (content.includes("# ") || content.includes("## ") || content.includes("### ")) {
    const hasSubstantialContent =
      content.length > 500 && (content.includes("- ") || content.includes("1. ") || content.includes("| "))

    if (hasSubstantialContent) {
      const title = extractDocumentTitle(content)
      artifacts.push({
        type: "document",
        title,
        content,
        fileExtension: "md",
        description: "Generated documentation",
      })
    }
  }

  // Extract JSON/YAML data structures
  const jsonRegex = /\`\`\`json\n([\s\S]*?)\`\`\`/g
  while ((match = jsonRegex.exec(content)) !== null) {
    const jsonContent = match[1].trim()
    if (jsonContent.length > 50) {
      artifacts.push({
        type: "data",
        title: "Generated JSON Data",
        content: jsonContent,
        language: "json",
        fileExtension: "json",
        description: "Generated JSON data structure",
      })
    }
  }

  const yamlRegex = /\`\`\`ya?ml\n([\s\S]*?)\`\`\`/g
  while ((match = yamlRegex.exec(content)) !== null) {
    const yamlContent = match[1].trim()
    if (yamlContent.length > 50) {
      artifacts.push({
        type: "data",
        title: "Generated YAML Configuration",
        content: yamlContent,
        language: "yaml",
        fileExtension: "yml",
        description: "Generated YAML configuration",
      })
    }
  }

  return artifacts
}

function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    cpp: "cpp",
    c: "c",
    csharp: "cs",
    php: "php",
    ruby: "rb",
    go: "go",
    rust: "rs",
    swift: "swift",
    kotlin: "kt",
    scala: "scala",
    html: "html",
    css: "css",
    scss: "scss",
    sql: "sql",
    json: "json",
    yaml: "yml",
    xml: "xml",
    markdown: "md",
    bash: "sh",
    shell: "sh",
    powershell: "ps1",
    dockerfile: "dockerfile",
    vue: "vue",
    react: "jsx",
    svelte: "svelte",
  }
  return extensions[language.toLowerCase()] || "txt"
}

function generateCodeTitle(code: string, language: string): string {
  // Try to extract a meaningful title from the code
  const lines = code.split("\n").filter((line) => line.trim())
  const codeText = code.toLowerCase()

  // Look for meaningful comments that describe the purpose (prioritize these)
  const meaningfulComments = lines.filter(line => {
    const trimmed = line.trim()
    if (!trimmed.startsWith("//") && !trimmed.startsWith("#") && !trimmed.startsWith("/*")) return false
    
    const comment = trimmed
      .replace(/^[\s/*#]+/, "")
      .replace(/\*\/$/, "")
      .trim()
      .toLowerCase()
    
    // Skip generic comments
    if (comment.length < 5 || 
        comment.includes("include") || 
        comment.includes("import") ||
        comment.includes("todo") ||
        comment.includes("fixme") ||
        comment.startsWith("@") ||
        comment.match(/^[a-z]+\.(h|hpp|js|ts|py)$/)) {
      return false
    }
    
    return comment.length > 0 && comment.length < 60
  })

  if (meaningfulComments.length > 0) {
    const comment = meaningfulComments[0]
      .replace(/^[\s/*#]+/, "")
      .replace(/\*\/$/, "")
      .trim()
    return comment.charAt(0).toUpperCase() + comment.slice(1)
  }

  // Look for main function or entry points
  if (codeText.includes("int main") || codeText.includes("def main") || codeText.includes("function main")) {
    // Try to infer purpose from context
    if (codeText.includes("currency") || codeText.includes("exchange")) {
      return "Currency Exchange Program"
    }
    if (codeText.includes("calculator")) {
      return "Calculator Program"
    }
    if (codeText.includes("game") || codeText.includes("player")) {
      return "Game Program"
    }
    if (codeText.includes("sort") || codeText.includes("search")) {
      return "Algorithm Implementation"
    }
    return "Main Program"
  }

  // Look for class definitions with meaningful names
  const classMatch = lines.find(line => 
    line.match(/class\s+([A-Z][a-zA-Z0-9_]*)/i) && 
    !line.toLowerCase().includes("test") &&
    !line.toLowerCase().includes("example")
  )
  if (classMatch) {
    const match = classMatch.match(/class\s+([A-Z][a-zA-Z0-9_]*)/i)
    if (match) {
      return `${match[1]} Class`
    }
  }

  // Look for function definitions with meaningful names
  const functionPatterns = [
    /function\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
    /def\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
    /const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/,
    /let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/,
    /var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/,
    /[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*{/, // C++ style functions
  ]

  for (const line of lines) {
    for (const pattern of functionPatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        const funcName = match[1]
        // Skip generic or test function names
        if (!funcName.toLowerCase().includes("test") && 
            !funcName.toLowerCase().includes("example") &&
            funcName.length > 2) {
          return `${funcName} Function`
        }
      }
    }
  }

  // Try to infer purpose from code content
  if (codeText.includes("currency") && codeText.includes("exchange")) {
    return "Currency Exchange Program"
  }
  if (codeText.includes("calculator") || (codeText.includes("add") && codeText.includes("subtract"))) {
    return "Calculator Program"
  }
  if (codeText.includes("database") || codeText.includes("sql")) {
    return "Database Code"
  }
  if (codeText.includes("api") || codeText.includes("endpoint")) {
    return "API Code"
  }
  if (codeText.includes("component") && (language === "javascript" || language === "typescript")) {
    return "React Component"
  }
  if (codeText.includes("algorithm") || codeText.includes("sort") || codeText.includes("search")) {
    return "Algorithm Implementation"
  }
  if (codeText.includes("server") || codeText.includes("express")) {
    return "Server Code"
  }
  if (codeText.includes("test") || codeText.includes("spec")) {
    return "Test Code"
  }

  // Language-specific intelligent defaults
  const smartDefaults: Record<string, string> = {
    javascript: "JavaScript Code",
    typescript: "TypeScript Code", 
    python: "Python Script",
    java: "Java Program",
    cpp: "C++ Program",
    c: "C Program",
    html: "HTML Document",
    css: "CSS Styles",
    sql: "SQL Query",
    bash: "Shell Script",
    dockerfile: "Docker Configuration",
    json: "JSON Data",
    yaml: "YAML Configuration",
    xml: "XML Document",
  }

  return smartDefaults[language.toLowerCase()] || `${language.charAt(0).toUpperCase() + language.slice(1)} Code`
}

function extractDocumentTitle(content: string): string {
  // Look for the first # header
  const headerMatch = content.match(/^#\s+(.+)$/m)
  if (headerMatch) {
    return headerMatch[1].trim()
  }

  // Look for the first ## header
  const subHeaderMatch = content.match(/^##\s+(.+)$/m)
  if (subHeaderMatch) {
    return subHeaderMatch[1].trim()
  }

  return "Generated Document"
}

async function createArtifactsFromContent(
  content: string,
  threadId: string,
  messageId: string,
  userId: string,
): Promise<void> {
  try {
    console.log(`🎨 Analyzing content for artifacts in message ${messageId}`)
    console.log(`📝 Content length: ${content.length} characters`)

    const artifacts = extractArtifacts(content, messageId)

    if (artifacts.length === 0) {
      console.log("🎨 No artifacts detected in content")
      return
    }

    console.log(`🎨 Creating ${artifacts.length} artifacts for message ${messageId}:`)
    artifacts.forEach((artifact, index) => {
      console.log(`  ${index + 1}. ${artifact.type}: "${artifact.title}" (${artifact.content.length} chars)`)
    })

    for (const artifact of artifacts) {
      const { error } = await supabaseServer.from("artifacts").insert({
        user_id: userId,
        thread_id: threadId,
        message_id: messageId,
        title: artifact.title,
        description: artifact.description,
        content: artifact.content,
        content_type: artifact.type,
        language: artifact.language,
        file_extension: artifact.fileExtension,
        tags: [artifact.type, artifact.language].filter(Boolean),
        metadata: {
          auto_generated: true,
          source: "ai_response",
          created_from_message: messageId,
        },
      })

      if (error) {
        console.error("❌ Failed to create artifact:", error)
      } else {
        console.log(`✅ Created artifact: ${artifact.title}`)
      }
    }

    console.log(`🎉 Successfully processed ${artifacts.length} artifacts for message ${messageId}`)
  } catch (error) {
    console.error("❌ Error creating artifacts:", error)
  }
}

export const runtime = "nodejs"
export const maxDuration = 60

// Circuit breaker for stream operations
const streamCircuitBreaker = new StreamCircuitBreaker(3, 300000) // 3 failures, 5 minute reset

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
          "Connection": "keep-alive",
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

    const { messages, model, webSearchEnabled, apiKey: bodyApiKey, data, experimental_attachments } = json
    const headersList = await headers()

    console.log("📨 Received messages:", messages?.length || 0)
    console.log("🤖 Using model:", model)
    console.log("🖼️ Image attachments received:", experimental_attachments?.length || 0)
    console.log("🚨 FULL REQUEST JSON:", JSON.stringify(json, null, 2))
    console.log("📦 Request data received:", data ? "present" : "not present")
    if (data) {
      console.log("📦 Data content:", {
        hasUserPreferences: !!data.userPreferences,
        userPreferences: data.userPreferences,
      })
    }
    if (experimental_attachments) {
      console.log("🖼️ Experimental attachments:", {
        count: experimental_attachments.length,
        images: experimental_attachments.map((att: any) => ({
          name: att.name,
          contentType: att.contentType,
          hasUrl: !!att.url
        }))
      })
    }

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
      return handleOllamaChat(req, messages, model, headersList, data)
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

      // Try to get the API key from the database as fallback
      try {
        console.log("🔍 Looking for API key in database for user:", user.id, "provider:", modelConfig.provider)
        const { data: dbApiKey, error: dbError } = await supabaseServer
          .from("api_keys")
          .select("provider, api_key")
          .eq("user_id", user.id)
          .eq("provider", modelConfig.provider.toLowerCase())
          .maybeSingle()

        if (dbError) {
          console.error("❌ Database error fetching API key:", dbError)
        } else if (dbApiKey?.api_key) {
          apiKey = dbApiKey.api_key
          console.log("✅ Found API key in database for provider:", modelConfig.provider)
        } else {
          console.log("❌ No API key found in database for provider:", modelConfig.provider)
        }
      } catch (dbError) {
        console.error("❌ Error fetching API key from database:", dbError)
      }
    }

    if (!apiKey) {
      console.log("❌ No API key available for provider:", modelConfig.provider)
      return NextResponse.json({ error: `${modelConfig.provider} API key is required` }, { status: 400 })
    }

    console.log("✅ API key found, length:", apiKey?.length || 0)

    // Create AI model
    let aiModel
    let modelSupportsSearch = false

    switch (modelConfig.provider) {
      case "google":
        console.log("🟢 Initializing Google model:", modelConfig.modelId)
        try {
          // Test the API key first
          console.log("🔑 Testing Google API key validity...")
          const google = createGoogleGenerativeAI({ apiKey: apiKey! })
          
          if (webSearchEnabled && modelConfig.supportsSearch) {
            console.log("🔍 Using Google model with search grounding")
            aiModel = google(modelConfig.modelId, { useSearchGrounding: true })
            modelSupportsSearch = true
          } else {
            console.log("🟢 Using Google model without search grounding")
            aiModel = google(modelConfig.modelId)
          }
          console.log("✅ Google model initialized successfully")
        } catch (error) {
          console.error("❌ Error initializing Google model:", error)
          console.error("❌ Google API error details:", {
            message: (error as Error)?.message,
            name: (error as Error)?.name,
            stack: (error as Error)?.stack
          })
          
          // Re-throw with more specific error message
          if (error instanceof Error) {
            if (error.message.includes("API_KEY_INVALID") || error.message.includes("403")) {
              throw new Error("Invalid Google API key. Please check your API key in Settings.")
            } else if (error.message.includes("QUOTA_EXCEEDED") || error.message.includes("429")) {
              throw new Error("Google API quota exceeded. Please try again later.")
            } else if (error.message.includes("model not found") || error.message.includes("404")) {
              throw new Error(`Google model '${modelConfig.modelId}' not found or not available.`)
            }
          }
          throw error
        }
        break

      case "openai":
        aiModel = openai(modelConfig.modelId)
        break

      case "openrouter":
        const openrouter = createOpenRouter({ apiKey: apiKey! })
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

    // Process messages - create AI-specific content with file data AND artifact data
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

      // Process artifact references in the message content
      if (messageContent.includes("@artifact[")) {
        console.log("🎨 Found artifact references in message")

        // Extract artifact references
        const artifactRegex = /@artifact\[([a-f0-9-]+)(?::insert)?\]/g
        const artifactMatches = [...messageContent.matchAll(artifactRegex)]

        if (artifactMatches.length > 0) {
          console.log(`🎨 Processing ${artifactMatches.length} artifact references`)

          // Fetch all referenced artifacts
          const artifactIds = artifactMatches.map((match) => match[1])
          const { data: artifacts, error: artifactError } = await supabaseServer
            .from("artifacts")
            .select("*")
            .in("id", artifactIds)
            .eq("user_id", user.id)

          if (artifactError) {
            console.error("❌ Failed to fetch artifacts:", artifactError)
          } else if (artifacts && artifacts.length > 0) {
            console.log(`✅ Found ${artifacts.length} artifacts`)

            // Replace artifact references with actual content
            let processedContent = messageContent

            for (const match of artifactMatches) {
              const fullMatch = match[0] // e.g., "@artifact[id]" or "@artifact[id:insert]"
              const artifactId = match[1]
              const isInsert = fullMatch.includes(":insert")

              const artifact = artifacts.find((a) => a.id === artifactId)
              if (artifact) {
                let replacement = ""

                if (isInsert) {
                  // INSERT: Include full content with clear labeling
                  replacement = `\n\n**Artifact: ${artifact.title}** (${artifact.content_type})\n\`\`\`${artifact.language || artifact.content_type}\n${artifact.content}\n\`\`\`\n`
                  console.log(`🎨 Inserting full content for artifact: ${artifact.title}`)
                } else {
                  // REFERENCE: Also include full content but with different context
                  replacement = `\n\n**Referenced Artifact: ${artifact.title}** (${artifact.content_type})\nHere's the content for your reference:\n\`\`\`${artifact.language || artifact.content_type}\n${artifact.content}\n\`\`\`\n`
                  console.log(`🎨 Providing full content for referenced artifact: ${artifact.title}`)
                }

                processedContent = processedContent.replace(fullMatch, replacement)
              } else {
                console.warn(`⚠️ Artifact not found: ${artifactId}`)
                processedContent = processedContent.replace(fullMatch, `[Artifact not found: ${artifactId}]`)
              }
            }

            messageContent = processedContent
            console.log("🎨 Processed message with artifacts:", messageContent.substring(0, 200) + "...")
          }
        }
      }

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

    // Extract user preferences from request data
    const userPreferences = data?.userPreferences || null
    console.log("👤 User preferences:", userPreferences ? "present" : "not found")
    if (userPreferences) {
      console.log("👤 User preferences details:", {
        preferredName: userPreferences.preferredName,
        occupation: userPreferences.occupation,
        assistantTraits: userPreferences.assistantTraits,
        customInstructions: userPreferences.customInstructions,
      })
    }

    // Create system prompt with persona integration and user preferences
    const systemPrompt = getSystemPrompt(
      webSearchEnabled,
      modelSupportsSearch,
      user.email || "",
      threadPersona,
      userPreferences,
    )
    console.log("📝 Generated system prompt preview:", systemPrompt.substring(0, 200) + "...")
    console.log("📝 Full system prompt:", systemPrompt)

    // Check if this model supports thinking and needs special processing
    const isThinkingModel = modelConfig.supportsThinking
    
    // Special handling for OpenAI O1 models - they don't use thinking tags and don't support streaming
    const isO1Model = modelConfig.provider === "openai" && (modelConfig.modelId === "o1-preview" || modelConfig.modelId === "o1-mini")
    
    // Custom thinking processor only for non-Google, non-O1 thinking models (like Ollama with thinking tags)
    const needsCustomThinkingProcessor = isThinkingModel && !isO1Model && modelConfig.provider !== "google"
    
    if (isO1Model) {
      console.log("🧠 Using OpenAI O1 model - non-streaming with internal reasoning")

      // O1 models don't support streaming and handle reasoning internally
      // They also don't support system messages, so we need to convert the system prompt to a user message
      const o1Messages = [...processedMessages]
      
      // If we have a system prompt, prepend it as a user message
      if (systemPrompt && systemPrompt.trim()) {
        o1Messages.unshift({
          role: "user",
          content: `System instructions: ${systemPrompt}\n\nPlease follow these instructions for all responses.`
        })
      }
      
      const completionOptions = {
        model: aiModel,
        messages: o1Messages,
        max_completion_tokens: 4000, // O1 models require max_completion_tokens instead of max_tokens
        experimental_attachments: experimental_attachments || undefined,
      }

      console.log("🚀 Starting O1 model generation (non-streaming)...")
      console.log("🧠 O1 messages count:", o1Messages.length)

      try {
        // Use generateText instead of streamText for O1 models
        const { generateText } = await import('ai')
        
        const result = await generateText(completionOptions)
        
        console.log("✅ O1 model generation completed")
        console.log("🧠 Reasoning tokens used:", result.usage?.completionTokens || 0)
        console.log("🧠 Total tokens used:", result.usage?.totalTokens || 0)
        
        // Create a reasoning explanation for O1 models since they don't expose their thinking
        const reasoningTokens = result.usage?.completionTokens || 0
        const totalTokens = result.usage?.totalTokens || 0
        const inputTokens = totalTokens - reasoningTokens
        
        const reasoningExplanation = `🧠 **O1 Model Internal Reasoning**

This response was generated using ${modelConfig.modelId}, which performs internal reasoning that is not exposed through the API.

**Token Usage:**
- Input tokens: ${inputTokens}
- Reasoning tokens: ${reasoningTokens} (internal thinking)
- Output tokens: ${reasoningTokens}
- Total tokens: ${totalTokens}

The model spent time thinking through your request before providing this response, but the reasoning process is handled internally by OpenAI and cannot be displayed.`
        
        // Save the message to database with reasoning explanation
        await handleMessageSave(
          threadId,
          aiMessageId,
          user.id,
          result.text,
          null, // no sources for O1
          result.providerMetadata,
          modelConfig,
          apiKey!,
          reasoningExplanation, // add reasoning explanation
        )

        // Return the result in the expected data stream format for the AI SDK
        const responseText = result.text
        
        // Create a simple data stream response (reasoning will be available through database)
        const dataStreamResponse = `0:${JSON.stringify(responseText)}\nd:{"finishReason":"stop"}\n`
        
        return new Response(dataStreamResponse, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        })
      } catch (error) {
        console.error("❌ Error with O1 model:", error)
        throw error
      }
    } else if (needsCustomThinkingProcessor) {
      console.log("🧠 Using thinking model - custom stream handling")

      // Create stream options without any transforms
      const streamOptions = {
        model: aiModel,
        messages: processedMessages,
        system: systemPrompt,
        experimental_attachments: experimental_attachments || undefined,
        onFinish: async ({ text, finishReason, usage, sources, providerMetadata }: any) => {
          console.log("🏁 AI generation finished")

          // Parse thinking content from text
          let cleanedText = text
          let reasoning = null

          if (text.includes("<Thinking>") && text.includes("</Thinking>")) {
            console.log("🧠 Detected thinking content in response")

            // Extract thinking content
            const thinkMatch = text.match(/<Thinking>([\s\S]*?)<\/Thinking>/)
            if (thinkMatch) {
              reasoning = thinkMatch[1].trim()
              console.log("🧠 Extracted reasoning:", reasoning.substring(0, 100) + "...")
            }

            // Remove thinking tags from the main content
            cleanedText = text.replace(/<Thinking>[\s\S]*?<\/think>/g, "").trim()
            console.log("🧠 Cleaned text length:", cleanedText.length)
          }

          await handleMessageSave(
            threadId,
            aiMessageId,
            user.id,
            cleanedText,
            sources,
            providerMetadata,
            modelConfig,
            apiKey!,
            reasoning,
          )
        },
      }

      console.log("🚀 Starting AI generation...")
      console.log("🤖 Final system prompt being sent to AI:", systemPrompt)

      // Wrap the stream creation in circuit breaker
      return await streamCircuitBreaker.execute(async () => {
        console.log("🔄 Executing streamText with thinking model")
        let result
        try {
          result = streamText(streamOptions)
          console.log("✅ streamText initialized successfully")
        } catch (error) {
          console.error("❌ Error in streamText initialization:", error)
          throw error
        }

        // Initialize enhanced stream protection for thinking models
        const streamProtection = new StreamProtection({
          maxRepetitions: 3, // Reduced from 4 to catch repetitions earlier
          repetitionWindowSize: 50, // Reduced from 100 to detect smaller repetition patterns
          maxResponseLength: 40000,
          timeoutMs: 180000, // 3 minutes for thinking models
          maxSimilarChunks: 4, // Reduced from 6 to be more aggressive about similar content
          minRepetitionLength: 5, // Add minimum length for repetition detection
        })

        // Create a custom readable stream that filters out thinking content AND protects against loops
        const customStream = new ReadableStream({
          async start(controller) {
            const reader = result.toDataStream().getReader()
            let buffer = ""
            let insideThinking = false
            let lastThinkingTag = ""

            const safeEnqueue = (chunk: Uint8Array) => {
              try {
                controller.enqueue(chunk)
              } catch (error) {
                console.warn("⚠️ Failed to enqueue chunk (controller may be closed):", error)
              }
            }

            const safeClose = () => {
              try {
                controller.close()
              } catch (error) {
                console.warn("⚠️ Failed to close controller (may already be closed):", error)
              }
            }

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = new TextDecoder().decode(value)
                buffer += chunk

                // For Google models, we don't need to filter thinking tags since they don't use them
                // Just process the content normally with protection
                if (modelConfig.provider === "google") {
                  // Google thinking models don't use <Thinking> tags, so process normally
                  // But we still need to parse the data stream format properly
                  const lines = chunk.split('\n').filter(Boolean)
                  
                  for (const line of lines) {
                    if (line.startsWith('0:')) {
                      // This is a text chunk
                      try {
                        const content = JSON.parse(line.substring(2))
                        if (content) {
                          const protectionResult = streamProtection.analyzeChunk(content)
                          
                          if (!protectionResult.allowed) {
                            console.warn(`🛡️ Stream protection triggered:`, protectionResult.reason)
                            const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                            const encodedError = `0:${JSON.stringify(errorMsg)}\n`
                            safeEnqueue(new TextEncoder().encode(encodedError))
                            safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                            safeClose()
                            return
                          }
                          
                          // Forward the properly formatted chunk
                          safeEnqueue(new TextEncoder().encode(line + '\n'))
                        }
                      } catch (e) {
                        console.warn('Failed to parse data stream chunk:', e)
                        // Forward as-is if parsing fails
                        safeEnqueue(new TextEncoder().encode(line + '\n'))
                      }
                    } else {
                      // Forward other data stream parts (like finish messages) as-is
                      safeEnqueue(new TextEncoder().encode(line + '\n'))
                    }
                  }
                } else {
                  // For non-Google thinking models (OpenAI, etc.), process <Thinking> tags
                  let processedChunk = ""
                  let i = 0

                  while (i < buffer.length) {
                    if (!insideThinking) {
                      // Look for start of thinking
                      const thinkStart = buffer.indexOf("<Thinking>", i)
                      if (thinkStart !== -1) {
                        // Add content before thinking tag
                        processedChunk += buffer.substring(i, thinkStart)
                        // Also include the thinking tag in the output for real-time processing
                        processedChunk += "<Thinking>"
                        insideThinking = true
                        i = thinkStart + 10 // Skip "<Thinking>"
                        lastThinkingTag = "<Thinking>"
                      } else {
                        // No thinking tag found, add rest of buffer
                        processedChunk += buffer.substring(i)
                        break
                      }
                    } else {
                      // Look for end of thinking
                      const thinkEnd = buffer.indexOf("</Thinking>", i)
                      if (thinkEnd !== -1) {
                        // Include thinking content in the output
                        const thinkingContent = buffer.substring(i, thinkEnd)
                        processedChunk += thinkingContent
                        processedChunk += "<Thinking></Thinking>" // Include closing tag

                        insideThinking = false
                        i = thinkEnd + 11 // Skip "<Thinking></Thinking>"
                        lastThinkingTag = "</Thinking>"
                      } else {
                        // Still inside thinking, include partial thinking content
                        processedChunk += buffer.substring(i)
                        break
                      }
                    }
                  }

                  // Update buffer to keep unprocessed content
                  if (i < buffer.length) {
                    buffer = buffer.substring(i)
                  } else {
                    buffer = ""
                  }

                  // Send processed chunk if we have content - but check for protection first
                  if (processedChunk) {
                    // Check with stream protection
                    const protectionResult = streamProtection.analyzeChunk(processedChunk)
                    
                    if (!protectionResult.allowed) {
                      console.warn(`🛡️ Stream protection triggered:`, protectionResult.reason)
                      const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                      const encodedError = `0:${JSON.stringify(errorMsg)}\n`
                      safeEnqueue(new TextEncoder().encode(encodedError))
                      safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                      safeClose()
                      return
                    }

                    // Re-encode as proper data stream format with proper JSON escaping
                    const encodedChunk = `0:${JSON.stringify(processedChunk)}\n`
                    safeEnqueue(new TextEncoder().encode(encodedChunk))
                  }
                }
              }

              // Send any remaining buffer content (outside thinking) for non-Google models
              if (buffer && !insideThinking && modelConfig.provider !== "google") {
                // Final protection check
                const protectionResult = streamProtection.analyzeChunk(buffer)
                if (protectionResult.allowed) {
                  const encodedChunk = `0:${JSON.stringify(buffer)}\n`
                  safeEnqueue(new TextEncoder().encode(encodedChunk))
                }
              }

              // Send properly formatted completion marker with finishReason
              safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
            } catch (error) {
              console.error("❌ Error in thinking stream processing:", error)
              safeClose()
            }
          },
        })

        return new Response(customStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        })
      })
    } else if (isThinkingModel && modelConfig.provider === "google") {
      // Google thinking models - use proper thinking configuration based on official docs
      console.log("🧠 Using Google thinking model processing for:", modelConfig.modelId)
      console.log("🤖 Model provider:", modelConfig.provider)
      console.log("🤖 Is thinking model:", isThinkingModel)
      
      const streamOptions = {
        model: aiModel,
        messages: processedMessages,
        system: systemPrompt,
        experimental_attachments: experimental_attachments || undefined,
        // Proper Google thinking configuration based on official docs
        experimental_providerOptions: {
          google: {
            thinkingConfig: {
              includeThoughts: true, // Enable thought summaries
            },
          },
        },
        onFinish: async ({ text, finishReason, usage, sources, providerMetadata }: any) => {
          console.log("🏁 AI generation finished")
          console.log("🔍 Provider metadata:", JSON.stringify(providerMetadata, null, 2))
          
          // Extract reasoning from Google thinking model response
          let cleanedText = text
          let reasoning = null
          
          // Check if the response contains thinking parts based on official docs
          if (providerMetadata?.parts) {
            console.log("🔍 Found parts in provider metadata:", providerMetadata.parts.length)
            const thoughtParts = providerMetadata.parts.filter((part: any) => part.thought)
            console.log("🔍 Found thought parts:", thoughtParts.length)
            if (thoughtParts.length > 0) {
              reasoning = thoughtParts.map((part: any) => part.thought).join('\n\n')
              console.log("🧠 Extracted Google thinking reasoning:", reasoning.substring(0, 100) + "...")
            }
          } else {
            console.log("🔍 No parts found in provider metadata")
          }
          
          try {
            await handleMessageSave(threadId, aiMessageId, user.id, cleanedText, sources, providerMetadata, modelConfig, apiKey!, reasoning)
            console.log("✅ Message saved successfully")
          } catch (saveError) {
            console.error("❌ Error saving message:", saveError)
          }
        },
      }

      console.log("🚀 Starting Google thinking model generation...")
      console.log("🤖 Final system prompt being sent to AI (Google thinking):", systemPrompt)
      console.log("🔧 Google thinking config:", JSON.stringify(streamOptions.experimental_providerOptions, null, 2))

      // Wrap the stream creation in circuit breaker
      return await streamCircuitBreaker.execute(async () => {
        console.log("🔄 Executing streamText with Google thinking model")
        let result
        try {
          result = streamText(streamOptions)
          console.log("✅ streamText initialized successfully for Google thinking model")
        } catch (error) {
          console.error("❌ Error in streamText initialization for Google thinking model:", error)
          // Check for specific Google API errors
          if (error instanceof Error) {
            if (error.message.includes("API_KEY_INVALID") || error.message.includes("403")) {
              throw new Error("Invalid Google API key. Please check your API key in Settings.")
            } else if (error.message.includes("QUOTA_EXCEEDED") || error.message.includes("429")) {
              throw new Error("Google API quota exceeded. Please try again later.")
            } else if (error.message.includes("model not found") || error.message.includes("404")) {
              throw new Error(`Model ${modelConfig.modelId} not found or not available.`)
            }
          }
          throw error
        }

        // Use the AI SDK's built-in data stream response with error handling
        return result.toDataStreamResponse({
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
          getErrorMessage: (error: unknown) => {
            console.error("🚨 Google thinking model stream error:", error)
            if (error == null) {
              return 'Unknown error occurred'
            }
            if (typeof error === 'string') {
              return error
            }
            if (error instanceof Error) {
              console.error("🚨 Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause
              })
              return error.message
            }
            return JSON.stringify(error)
          },
        })
      })
    } else {
      // Regular models - use standard processing with protection
      console.log("🤖 Using standard model processing for:", modelConfig.modelId)
      console.log("🤖 Model provider:", modelConfig.provider)
      console.log("🤖 Is thinking model:", isThinkingModel)
      
      const streamOptions = {
        model: aiModel,
        messages: processedMessages,
        system: systemPrompt,
        experimental_attachments: experimental_attachments || undefined,
        onFinish: async ({ text, finishReason, usage, sources, providerMetadata }: any) => {
          console.log("🏁 AI generation finished")
          try {
            await handleMessageSave(threadId, aiMessageId, user.id, text, sources, providerMetadata, modelConfig, apiKey!)
            console.log("✅ Message saved successfully")
          } catch (saveError) {
            console.error("❌ Error saving message:", saveError)
          }
        },
      }

      console.log("🚀 Starting AI generation...")
      console.log("🤖 Final system prompt being sent to AI (non-thinking):", systemPrompt)

      // Wrap the stream creation in circuit breaker
      return await streamCircuitBreaker.execute(async () => {
        console.log("🔄 Executing streamText with regular model")
        let result
        try {
          result = streamText(streamOptions)
          console.log("✅ streamText initialized successfully for regular model")
        } catch (error) {
          console.error("❌ Error in streamText initialization for regular model:", error)
          // Check for specific Google API errors
          if (error instanceof Error) {
            if (error.message.includes("API_KEY_INVALID") || error.message.includes("403")) {
              throw new Error("Invalid Google API key. Please check your API key in Settings.")
            } else if (error.message.includes("QUOTA_EXCEEDED") || error.message.includes("429")) {
              throw new Error("Google API quota exceeded. Please try again later.")
            } else if (error.message.includes("model not found") || error.message.includes("404")) {
              throw new Error(`Model ${modelConfig.modelId} not found or not available.`)
            }
          }
          throw error
        }

        // For regular models, use the AI SDK's built-in data stream response
        // This properly handles the finish message with finishReason
        return result.toDataStreamResponse({
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
          getErrorMessage: (error: unknown) => {
            console.error("🚨 Regular model stream error:", error)
            if (error == null) {
              return 'Unknown error occurred'
            }
            if (typeof error === 'string') {
              return error
            }
            if (error instanceof Error) {
              console.error("🚨 Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause
              })
              return error.message
            }
            return JSON.stringify(error)
          },
        })
      })
    }
  } catch (error) {
    console.error("💥 Unhandled Chat API error:", error)
    console.error("💥 Error stack:", (error as Error)?.stack)
    console.error("💥 Error details:", {
      message: (error as Error)?.message,
      name: (error as Error)?.name,
      cause: (error as Error)?.cause
    })

    // Check for specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes("API_KEY_INVALID") || error.message.includes("403")) {
        console.error("🔑 Google API key error detected")
        return NextResponse.json(
          { error: "Invalid Google API key. Please check your API key in Settings." },
          { status: 403 }
        )
      } else if (error.message.includes("QUOTA_EXCEEDED") || error.message.includes("429")) {
        console.error("📊 Google API quota error detected")
        return NextResponse.json(
          { error: "Google API quota exceeded. Please try again later." },
          { status: 429 }
        )
      } else if (error.message.includes("model not found") || error.message.includes("404")) {
        console.error("🤖 Model not found error detected")
        return NextResponse.json(
          { error: `Model not found or not available. Please try a different model.` },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: (error as Error)?.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? (error as Error)?.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// Helper function to get system prompt
function getSystemPrompt(
  webSearchEnabled: boolean,
  modelSupportsSearch: boolean,
  userEmail: string,
  persona: any = null,
  userPreferences: any = null,
) {
  let basePrompt = `You are LoveChat, an AI assistant that can answer questions and help with tasks.
Be helpful and provide relevant information.
Be respectful and polite in all interactions.
Be engaging and maintain a conversational tone.

IMPORTANT: If the user has provided personal information in your system instructions (such as their name, preferences, or other details), you DO have access to this information and should use it appropriately. Do not claim you don't have access to information that has been explicitly provided to you in this system prompt.`

  // Build personalization section from user preferences FIRST
  let personalizationSection = ""

  console.log("🔍 DEBUG: userPreferences value:", userPreferences)
  console.log("🔍 DEBUG: userPreferences type:", typeof userPreferences)
  console.log("🔍 DEBUG: userPreferences keys:", userPreferences ? Object.keys(userPreferences) : "null")

  if (userPreferences) {
    console.log("👤 Incorporating user preferences into system prompt")
    console.log("👤 Processing preferences:", {
      preferredName: userPreferences.preferredName,
      occupation: userPreferences.occupation,
      assistantTraits: userPreferences.assistantTraits,
      customInstructions: userPreferences.customInstructions,
    })

    // Add preferred name
    if (userPreferences.preferredName) {
      personalizationSection += `\nPERSONAL CONTEXT:\n- IMPORTANT: The user's name is "${userPreferences.preferredName}". You DO have access to this information because the user has explicitly provided it. When asked about their identity or who they are, you should acknowledge that you know their name is "${userPreferences.preferredName}". Use their name naturally in conversation when appropriate.`
      console.log("👤 Added preferred name to prompt:", userPreferences.preferredName)
    }

    // Add occupation context
    if (userPreferences.occupation) {
      personalizationSection += `\n- The user works as: ${userPreferences.occupation}. Keep this context in mind when providing relevant examples and explanations.`
      console.log("👤 Added occupation to prompt:", userPreferences.occupation)
    }

    // Add assistant traits
    if (userPreferences.assistantTraits && userPreferences.assistantTraits.length > 0) {
      personalizationSection += `\n- Embody these personality traits: ${userPreferences.assistantTraits.join(", ")}. Let these traits guide your communication style and approach.`
      console.log("👤 Added assistant traits to prompt:", userPreferences.assistantTraits)
    }

    // Add custom instructions
    if (userPreferences.customInstructions) {
      personalizationSection += `\n- Custom instructions from the user: ${userPreferences.customInstructions}`
      console.log("👤 Added custom instructions to prompt:", userPreferences.customInstructions)
    }

    // Add custom instructions
    if (userPreferences.customInstructions) {
      personalizationSection += `\n- Custom instructions from the user: ${userPreferences.customInstructions}`
      console.log("👤 Added custom instructions to prompt:", userPreferences.customInstructions)
    }

    if (personalizationSection) {
      personalizationSection += "\n"
    }

    console.log("👤 Final personalization section:", personalizationSection)
  } else {
    console.log("👤 No user preferences provided to system prompt function")
  }

  // If a persona is active, replace the base prompt with the persona's system prompt
  // but ALWAYS keep the personalization section
  if (persona && persona.system_prompt) {
    console.log("🎭 Using persona system prompt:", persona.name)
    basePrompt = persona.system_prompt
  }

  const finalPrompt = `${basePrompt}${personalizationSection}

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

ARTIFACT SYSTEM:
You can also work with user artifacts (code, documents, data they've created):
- When you see [Referenced artifact: "title"], the user is mentioning an artifact they have
- When you see **Artifact: title** with code blocks, the user has inserted the full artifact content for analysis
- For referenced artifacts, you can ask the user if they want you to analyze the full content
- For inserted artifacts, analyze the content directly and provide detailed feedback
- Artifacts are user-created content from their personal library

When you receive files or artifacts:
1. Immediately acknowledge you can see them: "I can see the file(s)/artifact(s) you've shared: [names]"
2. Provide detailed analysis of the content
3. Answer any questions about the files/artifacts
4. Focus on the user's question while referencing the content

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
- Tables using markdown syntax (pipe-separated with header row)
  Example:
  | Column 1 | Column 2 | Column 3 |
  |----------|----------|----------|
  | Row 1    | Data 1   | Value 1  |
  | Row 2    | Data 2   | Value 2  |
  | Row 3    | Data 3   | Value 3  |
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
  - Display integral: $$\\int_a^b f(x) dx$
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

Current user: ${userEmail}${personalizationSection ? `\n\nUSER PERSONALIZATION:${personalizationSection}` : ""}`

  console.log("🔍 DEBUG: Final complete system prompt:", finalPrompt)
  return finalPrompt
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
  reasoning?: string | null,
) {
  try {
    console.log("💾 Saving AI message...")

    if (threadId && text) {
      const messageParts = [{ type: "text", text }]

      if (sources && sources.length > 0) {
        messageParts.push({ type: "sources", sources } as any)
      }

      if (reasoning) {
        messageParts.push({ type: "reasoning", reasoning } as any)
        console.log("🧠 Added reasoning to message parts")
      }

      const aiMessage = {
        id: aiMessageId,
        thread_id: threadId,
        user_id: userId,
        parts: messageParts,
        content: text,
        role: "assistant" as const,
        reasoning: reasoning, // Store reasoning at message level too
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
    // Add this at the end of the handleMessageSave function, after the message is saved successfully
    if (threadId && text && text.trim().length > 0) {
      // Create artifacts from the AI response content
      await createArtifactsFromContent(text, threadId, aiMessageId, userId)
    }
  } catch (error) {
    console.error("💥 Error saving AI message:", error)
  }
}

// Ollama handler function
async function handleOllamaChat(req: NextRequest, messages: any[], model: string, headersList: Headers, data?: any) {
  try {
    console.log("🦙 Handling Ollama chat request")

    // Get authorization header and authenticate user
    const authHeader = headersList.get("authorization")
    let user = null
    let userEmail = ""

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const authResult = await supabaseServer.auth.getUser(token)
      if (!authResult.error && authResult.data.user) {
        user = authResult.data.user
        userEmail = user.email || ""
        console.log("✅ Ollama user authenticated:", user.id)
      }
    }

    const ollamaModel = model.replace("ollama:", "")
    console.log("🦙 Using Ollama model:", ollamaModel)

    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434"
    console.log("🦙 Ollama URL:", ollamaUrl)

    // Get model config to check if this is a thinking model
    const modelConfig = getModelConfig(model as AIModel)
    const isThinkingModel = modelConfig.supportsThinking
    console.log("🧠 Ollama model supports thinking:", isThinkingModel)

    const threadId = req.nextUrl.searchParams.get("threadId") as string
    const aiMessageId = uuidv4()

    // Get thread persona if one is assigned and user is authenticated
    let threadPersona = null
    if (threadId && user) {
      try {
        console.log("🎭 Looking up persona for Ollama thread:", threadId)

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
          console.log("✅ Found persona for Ollama thread:", threadPersona.name)
        } else {
          console.log("ℹ️ No persona assigned to Ollama thread")
        }
      } catch (error) {
        console.log("⚠️ Error looking up persona for Ollama:", error)
      }
    }

    // Extract user preferences from request data
    const userPreferences = data?.userPreferences || null
    console.log("👤 Ollama user preferences:", userPreferences ? "present" : "not found")
    if (userPreferences) {
      console.log("👤 Ollama user preferences details:", {
        preferredName: userPreferences.preferredName,
        occupation: userPreferences.occupation,
        assistantTraits: userPreferences.assistantTraits,
        customInstructions: userPreferences.customInstructions,
      })
    }

    // Create system prompt for Ollama (will be injected as system message)
    const systemPrompt = getSystemPrompt(false, false, userEmail, threadPersona, userPreferences) // Ollama doesn't support web search in this context
    console.log("📝 Ollama generated system prompt preview:", systemPrompt.substring(0, 200) + "...")
    console.log("🤖 Full Ollama system prompt being sent:", systemPrompt)

    // Prepare messages for Ollama - inject system prompt as system message
    const ollamaMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages,
    ]

    console.log("📨 Ollama messages prepared:", ollamaMessages.length)

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: ollamaMessages,
        stream: true,
      }),
    })

    if (!response.ok) {
      console.error("❌ Ollama API error:", response.status, response.statusText)
      return NextResponse.json({ error: "Ollama API error" }, { status: response.status })
    }

    console.log("✅ Ollama response received, streaming...")

    // For thinking models, we need special handling
    if (isThinkingModel) {
      console.log("🧠 Using thinking-aware stream processing for Ollama")

      // Initialize stream protection for Ollama thinking models
      const streamProtection = new StreamProtection({
        maxRepetitions: 3, // Reduced from 4 to catch repetitions earlier
        repetitionWindowSize: 50, // Reduced from 100 to detect smaller repetition patterns
        maxResponseLength: 40000,
        timeoutMs: 180000, // 3 minutes for thinking models
        maxSimilarChunks: 4, // Reduced from 6 to be more aggressive about similar content
        minRepetitionLength: 5, // Add minimum length for repetition detection
      })

      // Create a readable stream from the Ollama response with thinking handling AND protection
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          let isClosed = false
          let buffer = ""
          let insideThinking = false
          let fullResponse = ""
          let reasoning = null
          let cleanedText = "" // Declare cleanedText here

          const safeEnqueue = (chunk: Uint8Array) => {
            if (!isClosed) {
              try {
                controller.enqueue(chunk)
              } catch (error) {
                console.warn("⚠️ Controller already closed, ignoring chunk")
                isClosed = true
              }
            }
          }

          const safeClose = () => {
            if (!isClosed) {
              try {
                controller.close()
                isClosed = true
              } catch (error) {
                console.warn("⚠️ Controller already closed")
              }
            }
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              // Parse the Ollama response chunks
              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split("\n").filter((line) => line.trim())

              for (const line of lines) {
                if (isClosed) break

                try {
                  const data = JSON.parse(line)
                  if (data.message?.content) {
                    const content = data.message.content
                    fullResponse += content

                    // Process for thinking tags
                    buffer += content
                    let processedContent = ""

                    // Simple state machine to extract thinking content
                    let i = 0
                    while (i < buffer.length) {
                      if (!insideThinking) {
                        // Look for start of thinking
                        const thinkStart = buffer.indexOf("<Thinking>", i)
                        if (thinkStart !== -1) {
                          // Add content before thinking
                          processedContent += buffer.substring(i, thinkStart)
                          // Also include the thinking tag in the output for real-time processing
                          processedContent += "<Thinking>"
                          insideThinking = true
                          i = thinkStart + 10 // Skip "<Thinking>"
                        } else {
                          // No thinking tag found, add rest of buffer
                          processedContent += buffer.substring(i)
                          break
                        }
                      } else {
                        // Look for end of thinking
                        const thinkEnd = buffer.indexOf("</Thinking>", i)
                        if (thinkEnd !== -1) {
                          // Capture thinking content
                          const thinkingContent = buffer.substring(i, thinkEnd)
                          if (!reasoning) reasoning = thinkingContent
                          else reasoning += thinkingContent

                          // Skip thinking content
                          insideThinking = false
                          i = thinkEnd + 11 // Skip "</Thinking>"
                        } else {
                          // Still inside thinking, skip rest of buffer
                          break
                        }
                      }
                    }

                    // Update buffer to keep unprocessed content
                    if (i < buffer.length) {
                      buffer = buffer.substring(i)
                    } else {
                      buffer = ""
                    }

                    // Only send non-thinking content - but check protection first
                    if (processedContent) {
                      // Check with stream protection
                      const protectionResult = streamProtection.analyzeChunk(processedContent)

                      if (!protectionResult.allowed) {
                        console.warn("🛡️ Ollama stream protection triggered:", protectionResult.reason)
                        console.log("📊 Ollama stream stats:", streamProtection.getStats())

                        // Send error message to client
                        const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                        const encodedError = `0:"${errorMsg.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"\n`
                        safeEnqueue(new TextEncoder().encode(encodedError))

                        // Terminate the stream
                        safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                        safeClose()
                        return
                      }

                      // Format as AI SDK compatible stream
                      const streamChunk = `0:"${processedContent.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"\n`
                      safeEnqueue(new TextEncoder().encode(streamChunk))
                    }
                  }

                  if (data.done) {
                    safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))

                    // Save the message with reasoning
                    if (threadId && user) {
                      // Clean the full response by removing thinking tags
                      cleanedText = fullResponse.replace(/<Thinking>[\s\S]*?<\/think>/g, "").trim()

                      await handleMessageSave(
                        threadId,
                        aiMessageId,
                        user.id,
                        cleanedText,
                        null, // sources
                        null, // providerMetadata
                        modelConfig,
                        "", // Ollama doesn't use API keys
                        reasoning,
                      )
                    }
                    // In the thinking model section, after saving the message, add:
                    if (threadId && user && cleanedText && cleanedText.trim().length > 0) {
                      await createArtifactsFromContent(cleanedText, threadId, aiMessageId, user.id)
                    }

                    safeClose()
                    return
                  }
                } catch (parseError) {
                  console.warn("⚠️ Failed to parse Ollama chunk:", parseError)
                }
              }
            }
          } catch (error) {
            console.error("❌ Error reading Ollama stream:", error)
            if (!isClosed) {
              try {
                controller.error(error)
              } catch (controllerError) {
                console.warn("⚠️ Failed to signal error to controller")
              }
            }
          } finally {
            safeClose()
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    } else {
      // Regular non-thinking Ollama model
      console.log("🦙 Using standard stream processing for Ollama")

      // Initialize stream protection for regular Ollama models
      const streamProtection = new StreamProtection({
        maxRepetitions: 5,
        repetitionWindowSize: 80,
        maxResponseLength: 50000,
        timeoutMs: 120000, // 2 minutes for regular models
        maxSimilarChunks: 8,
      })

      // Create a readable stream from the Ollama response with protection
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          let isClosed = false

          const safeEnqueue = (chunk: Uint8Array) => {
            if (!isClosed) {
              try {
                controller.enqueue(chunk)
              } catch (error) {
                console.warn("⚠️ Controller already closed, ignoring chunk")
                isClosed = true
              }
            }
          }

          const safeClose = () => {
            if (!isClosed) {
              try {
                controller.close()
                isClosed = true
              } catch (error) {
                console.warn("⚠️ Controller already closed")
              }
            }
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              // Parse the Ollama response chunks
              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split("\n").filter((line) => line.trim())

              for (const line of lines) {
                if (isClosed) break

                try {
                  const data = JSON.parse(line)
                  if (data.message?.content) {
                    const content = data.message.content

                    // Check with stream protection
                    const protectionResult = streamProtection.analyzeChunk(content)

                    if (!protectionResult.allowed) {
                      console.warn("🛡️ Ollama stream protection triggered:", protectionResult.reason)
                      console.log("📊 Ollama stream stats:", streamProtection.getStats())

                      // Send error message to client
                      const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                      const encodedError = `0:"${errorMsg.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"\n`
                      safeEnqueue(new TextEncoder().encode(encodedError))

                      // Terminate the stream
                      safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                      safeClose()
                      return
                    }

                    // Format as AI SDK compatible stream
                    const streamChunk = `0:"${content.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"\n`
                    safeEnqueue(new TextEncoder().encode(streamChunk))
                  }
                  if (data.done) {
                    safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                    safeClose()
                    return
                  }
                } catch (parseError) {
                  console.warn("⚠️ Failed to parse Ollama chunk:", parseError)
                }
              }
            }
          } catch (error) {
            console.error("❌ Error reading Ollama stream:", error)
            if (!isClosed) {
              try {
                controller.error(error)
              } catch (controllerError) {
                console.warn("⚠️ Failed to signal error to controller")
              }
            }
          } finally {
            safeClose()
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    }
  } catch (error) {
    console.error("💥 Ollama handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
