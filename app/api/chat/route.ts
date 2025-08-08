import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { openai, createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText } from "ai"
import { headers } from "next/headers"
import { getModelConfig, type AIModel } from "@/lib/models"
import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"
import { CustomResumableStream } from "@/lib/resumable-streams-server"
import { StreamProtection, StreamCircuitBreaker } from "@/lib/stream-protection"
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google"
import { search } from "@/lib/tools"

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

  // Extract display math ($$...$$)
  const displayMathRegex = /\$\$([\s\S]*?)\$\$/g
  while ((match = displayMathRegex.exec(content)) !== null) {
    const mathContent = match[1].trim()
    if (mathContent.length > 10) { // Only substantial math expressions
      artifacts.push({
        type: "document",
        title: "Mathematical Expression",
        content: `$$${mathContent}$$`,
        language: "latex",
        fileExtension: "tex",
        description: "Generated mathematical expression",
      })
    }
  }

  // Extract markdown tables
  const tableRegex = /(\|[^\n]*\|\n\|[-:\s|]*\|\n(?:\|[^\n]*\|\n?)*)/g
  while ((match = tableRegex.exec(content)) !== null) {
    const tableContent = match[1].trim()
    const rows = tableContent.split('\n').filter(row => row.trim())
    
    // Only create artifacts for tables with at least 3 rows (header + separator + data)
    if (rows.length >= 3) {
      // Extract table title from surrounding context or use generic title
      const tableTitle = extractTableTitle(content, match.index) || "Generated Table"
      
      artifacts.push({
        type: "data",
        title: tableTitle,
        content: tableContent,
        language: "markdown",
        fileExtension: "md",
        description: "Generated markdown table",
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

function extractTableTitle(content: string, tableIndex: number): string | null {
  // Look for a heading or descriptive text before the table
  const beforeTable = content.substring(0, tableIndex)
  const lines = beforeTable.split('\n').reverse()
  
  // Look for the closest heading or descriptive line
  for (let i = 0; i < Math.min(lines.length, 8); i++) { // Increased search range
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) continue
    
    // Check for markdown headings (# ## ### etc.)
    const headingMatch = line.match(/^#+\s*(.+)$/)
    if (headingMatch) {
      return headingMatch[1].trim()
    }
    
    // Check for lines that might describe the table (expanded keywords)
    if (line.length > 5 && line.length < 150) {
      const lowercaseLine = line.toLowerCase()
      const tableIndicators = [
        'table', 'data', 'comparison', 'results', 'summary', 'overview',
        'breakdown', 'analysis', 'report', 'chart', 'list', 'features',
        'requirements', 'specifications', 'details', 'information',
        'key', 'main', 'important', 'following', 'below', 'above'
      ]
      
      if (tableIndicators.some(indicator => lowercaseLine.includes(indicator))) {
        // Clean up the line for use as title
        return line.replace(/[.!?:]+$/, '').trim()
      }
    }
    
    // Look for sentences that precede the table (context clues)
    if (line.length > 10 && line.length < 120 && 
        (line.includes(':') || line.endsWith('.') || line.endsWith('!'))) {
      // This might be descriptive text about the table
      return line.replace(/[.!?:]+$/, '').trim()
    }
  }
  
  // Analyze the table content itself to generate a meaningful title
  const afterTable = content.substring(tableIndex)
  const tableMatch = afterTable.match(/(\|[^\n]*\|\n\|[-:\s|]*\|\n(?:\|[^\n]*\|\n?)*)/)
  
  if (tableMatch) {
    const tableContent = tableMatch[1]
    const rows = tableContent.split('\n').filter(row => row.trim() && !row.match(/^[\|\s\-:]+$/))
    
    if (rows.length > 0) {
      // Extract headers from first row
      const headerRow = rows[0]
      const headers = headerRow.split('|').map(h => h.trim()).filter(h => h)
      
      if (headers.length > 0) {
        // Create title based on content analysis
        const firstHeader = headers[0].toLowerCase()
        const hasMultipleColumns = headers.length > 1
        
        // Smart title generation based on headers
        if (firstHeader.includes('feature') || firstHeader.includes('requirement')) {
          return hasMultipleColumns ? 'Feature Comparison Table' : 'Feature List'
        } else if (firstHeader.includes('step') || firstHeader.includes('stage')) {
          return 'Process Steps Table'
        } else if (firstHeader.includes('name') || firstHeader.includes('item')) {
          return hasMultipleColumns ? 'Summary Table' : 'Item List'
        } else if (firstHeader.includes('category') || firstHeader.includes('type')) {
          return 'Category Breakdown'
        } else if (headers.some(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('cost'))) {
          return 'Pricing Table'
        } else if (headers.some(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time'))) {
          return 'Timeline Table'
        } else {
          // Generic but descriptive titles
          return hasMultipleColumns ? `${headers[0]} Comparison` : `${headers[0]} Overview`
        }
      }
    }
  }
  
  return null
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

    const { messages, model, webSearchEnabled: userWebSearchEnabled, apiKey: bodyApiKey, data, experimental_attachments, studyMode } = json
    const headersList = await headers()

    // Analyze user message to determine if web search should be automatically enabled
    const shouldAutoEnableWebSearch = (messages: any[]) => {
      if (!messages || messages.length === 0) return false
      
      const lastMessage = messages[messages.length - 1]
      if (!lastMessage || lastMessage.role !== "user") return false
      
      const content = lastMessage.content?.toLowerCase() || ""
      
      // Keywords that indicate web search is needed
      const webSearchIndicators = [
        // Direct search requests
        "search for", "look up", "find information", "research", "investigate",
        "what's happening", "current", "latest", "recent", "news", "today",
        
        // URLs provided
        "http://", "https://", "www.", ".com", ".org", ".net", ".edu", ".gov",
        
        // Time-sensitive queries
        "weather", "stock price", "exchange rate", "current events", "breaking news",
        "what time", "when is", "schedule", "upcoming", "trending",
        
        // Market/financial queries
        "price of", "cost of", "market cap", "stock", "crypto", "bitcoin", "ethereum",
        
        // Travel and live information
        "flight", "restaurant", "hours", "open now", "near me", "directions",
        
        // Fact-checking and current data
        "verify", "fact check", "is it true", "according to", "source",
        "statistics", "data", "survey", "study", "report",
        
        // Technology and product queries
        "release date", "new version", "update", "download", "specs", "review",
        
        // General research terms
        "compare", "vs", "versus", "best", "top", "ranking", "list of"
      ]
      
      // Check if content contains any web search indicators
      return webSearchIndicators.some(indicator => content.includes(indicator))
    }

    // Determine final web search enabled state
    const webSearchEnabled = userWebSearchEnabled || shouldAutoEnableWebSearch(messages)
    
    // Log the decision
    if (!userWebSearchEnabled && webSearchEnabled) {
      console.log("🤖 Automatically enabled web search based on user query")
    }

    console.log("📨 Received messages:", messages?.length || 0)
    console.log("🤖 Using model:", model)
    console.log("🔍 Web search enabled:", webSearchEnabled, "(user:", userWebSearchEnabled, ", auto:", !userWebSearchEnabled && webSearchEnabled, ")")
    console.log("🖼️ Image attachments received:", experimental_attachments?.length || 0)
    console.log("🚨 FULL REQUEST JSON:", JSON.stringify(json, null, 2))
    console.log("📦 Request data received:", data ? "present" : "not present")
    console.log("🎓 Study mode:", !!studyMode)
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
      return handleOllamaChat(req, messages, model, headersList, data, studyMode)
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

    // Try to get user's API key from database first
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
          console.log("✅ Found user API key in database for provider:", modelConfig.provider)
        } else {
          console.log("❌ No user API key found in database for provider:", modelConfig.provider)
        }
      } catch (dbError) {
        console.error("❌ Error fetching API key from database:", dbError)
      }
    }

    // Fallback to environment variables if no user key is found (only for Google)
    if (!apiKey) {
      console.log("🔄 Checking if fallback API key is allowed for provider:", modelConfig.provider)
      
      switch (modelConfig.provider.toLowerCase()) {
        case "openai":
          // OpenAI requires user-provided API key - no fallback
          console.log("❌ OpenAI requires user-provided API key - no server fallback allowed")
          break
        case "google":
          // Google allows server fallback
          apiKey = process.env.GOOGLE_API_KEY || null
          if (apiKey) {
            console.log("✅ Using server fallback API key for Google")
          } else {
            console.log("❌ No server fallback API key available for Google")
          }
          break
        case "openrouter":
          // OpenRouter requires user-provided API key - no fallback
          console.log("❌ OpenRouter requires user-provided API key - no server fallback allowed")
          break
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
        console.log("🔵 Initializing OpenAI model:", modelConfig.modelId)
        try {
          const openaiClient = createOpenAI({ apiKey: apiKey! })
          aiModel = openaiClient(modelConfig.modelId)
          
          // Check if web search is enabled and supported
          if (webSearchEnabled && modelConfig.supportsSearch) {
            console.log("🔍 OpenAI model supports web search")
            modelSupportsSearch = true
          }
          
          console.log("✅ OpenAI model initialized successfully")
        } catch (error) {
          console.error("❌ Error initializing OpenAI model:", error)
          console.error("❌ OpenAI API error details:", {
            message: (error as Error)?.message,
            name: (error as Error)?.name,
            stack: (error as Error)?.stack
          })
          
          // Re-throw with more specific error message
          if (error instanceof Error) {
            if (error.message.includes("API_KEY_INVALID") || error.message.includes("401")) {
              throw new Error("Invalid OpenAI API key. Please check your API key in Settings.")
            } else if (error.message.includes("QUOTA_EXCEEDED") || error.message.includes("429")) {
              throw new Error("OpenAI API quota exceeded. Please try again later.")
            } else if (error.message.includes("model not found") || error.message.includes("404")) {
              throw new Error(`OpenAI model '${modelConfig.modelId}' not found or not available.`)
            }
          }
          throw error
        }
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
    const processedMessages: any[] = []

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
    const reasoningEffort = data?.reasoningEffort || "medium" // Default to medium if not specified
    console.log("👤 User preferences:", userPreferences ? "present" : "not found")
    console.log("🧠 Reasoning effort:", reasoningEffort)
    if (userPreferences) {
      console.log("👤 User preferences details:", {
        preferredName: userPreferences.preferredName,
        occupation: userPreferences.occupation,
        assistantTraits: userPreferences.assistantTraits,
        customInstructions: userPreferences.customInstructions,
      })
    }

    // Check if this model supports thinking and needs special processing
    const isThinkingModel = modelConfig.supportsThinking

    // Create system prompt with persona integration and user preferences
    const systemPrompt = getSystemPrompt(
      webSearchEnabled,
      modelSupportsSearch,
      user.email || "",
      threadPersona,
      userPreferences,
      isThinkingModel,
      modelConfig.provider,
      modelConfig.modelId,
      studyMode,
    )
    console.log("📝 Generated system prompt preview:", systemPrompt.substring(0, 200) + "...")
    console.log("📝 Full system prompt:", systemPrompt)
    
    // Special handling for OpenAI reasoning models - they use the new Responses API
    const isOpenAIReasoningModel = modelConfig.provider === "openai" && modelConfig.supportsThinking
    
    // Custom thinking processor only for Ollama models - DeepSeek uses standard processing
    const needsCustomThinkingProcessor = isThinkingModel && !isOpenAIReasoningModel && modelConfig.provider !== "google" && modelConfig.provider !== "openrouter"
    
    // Debug the routing logic for deepseek models
    console.log("🧠 Model routing debug:", {
      modelId: modelConfig.modelId,
      provider: modelConfig.provider,
      isThinkingModel,
      isOpenAIReasoningModel,
      needsCustomThinkingProcessor,
      supportsThinking: modelConfig.supportsThinking
    })
    
    if (isOpenAIReasoningModel) {
      console.log("🧠 Using OpenAI reasoning model with Responses API:", modelConfig.modelId)

      try {
        // Prepare input messages for the Responses API
        const inputMessages = [...processedMessages]
        
        // Add system prompt as the first user message if present
        if (systemPrompt && systemPrompt.trim()) {
          inputMessages.unshift({
            role: "user",
            content: `System instructions: ${systemPrompt}\n\nPlease follow these instructions for all responses.`
          })
        }

        console.log("🚀 Starting OpenAI reasoning model generation...")
        console.log("🧠 Input messages count:", inputMessages.length)
        console.log("🔑 API Key present:", apiKey ? `${apiKey.substring(0, 10)}...` : "MISSING")
        console.log("🎯 Model ID:", modelConfig.modelId)

        // Prepare tools for OpenAI reasoning models web search
        let tools = undefined
        if (webSearchEnabled && modelSupportsSearch) {
          console.log("🔍 Adding Serper web search tool to reasoning model")
          // Check if Serper API key is available
          const serperApiKey = process.env.SERPER_API_KEY
          if (serperApiKey) {
            // For the Responses API, we need to convert our tool to the format expected
            tools = [{
              type: "function",
              function: {
                name: "web_search",
                description: "Search the web for current information using Google search results",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The search query to look up"
                    },
                    maxResults: {
                      type: "number",
                      description: "Maximum number of results to return",
                      default: 5
                    }
                  },
                  required: ["query"]
                }
              }
            }]
            console.log("✅ Serper web search tool configured for reasoning model")
          } else {
            console.warn("⚠️ SERPER_API_KEY not found, skipping web search tool for reasoning model")
          }
        }

        const requestBody = {
          model: modelConfig.modelId,
          reasoning: { 
            effort: reasoningEffort, // Use user-selected reasoning effort
            summary: "auto" // Use "auto" as recommended for summaries
          },
          input: inputMessages,
          max_output_tokens: 25000, // Reserve space for reasoning as recommended
          tools: tools,
        }

        console.log("📤 Request body:", JSON.stringify(requestBody, null, 2))

        // Use the OpenAI Responses API directly
        const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        })

        console.log("📡 OpenAI API Response Status:", openaiResponse.status)
        console.log("📡 OpenAI API Response Headers:", Object.fromEntries(openaiResponse.headers.entries()))

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text()
          console.error("❌ OpenAI Responses API error:", openaiResponse.status, errorText)
          
          // Check for specific error types
          if (openaiResponse.status === 404) {
            throw new Error(`OpenAI reasoning model '${modelConfig.modelId}' not found. This model may require organization verification or may not be available yet. Please check your OpenAI account access.`)
          } else if (openaiResponse.status === 401) {
            throw new Error("Invalid OpenAI API key. Please check your API key in Settings.")
          } else if (openaiResponse.status === 429) {
            throw new Error("OpenAI API rate limit exceeded. Please try again later.")
          } else if (openaiResponse.status === 403) {
            throw new Error(`Access denied to OpenAI reasoning model '${modelConfig.modelId}'. You may need organization verification to access this model.`)
          }
          
          throw new Error(`OpenAI Responses API error: ${openaiResponse.status} ${errorText}`)
        }

        const responseData = await openaiResponse.json()
        
        console.log("✅ OpenAI reasoning model generation completed")
        console.log("🧠 Full response data:", JSON.stringify(responseData, null, 2))
        console.log("🧠 Response status:", responseData.status)
        console.log("🧠 Token usage:", responseData.usage)
        console.log("🧠 Output text:", responseData.output_text)
        console.log("🧠 Output array:", responseData.output)
        
        // Extract the response text and reasoning summary
        let responseText = responseData.output_text || ""
        let reasoningSummary = null
        
        // If output_text is empty, try to extract from output array
        if (!responseText && responseData.output && Array.isArray(responseData.output)) {
          console.log("🔍 output_text is empty, checking output array...")
          
          // Look for message content in the output array
          const messageItem = responseData.output.find((item: any) => 
            item.type === "message" && item.content
          )
          
          if (messageItem && Array.isArray(messageItem.content)) {
            console.log("🔍 Message item content structure:", JSON.stringify(messageItem.content, null, 2))
            
            // Extract text from content array
            const textContent = messageItem.content
              .filter((content: any) => content.type === "text")
              .map((content: any) => content.text)
              .join("")
            
            if (textContent) {
              responseText = textContent
              console.log("🔍 Found text in message content:", typeof responseText === 'string' ? responseText.substring(0, 100) + "..." : responseText)
            } else {
              // Try alternative extraction methods
              console.log("🔍 No text found with standard method, trying alternatives...")
              
              // Try to get any text content regardless of type
              const alternativeText = messageItem.content
                .map((content: any) => content.text || content.content || content)
                .filter((text: any) => typeof text === 'string' && text.trim())
                .join("")
              
              if (alternativeText) {
                responseText = alternativeText
                console.log("🔍 Found text with alternative method:", responseText.substring(0, 100) + "...")
              }
            }
          }
          
          // Fallback: look for any item with text content
          if (!responseText) {
            const textItem = responseData.output.find((item: any) => 
              item.type === "text" || item.text
            )
            
            if (textItem) {
              responseText = textItem.text || textItem.content || ""
              console.log("🔍 Found text in fallback search:", typeof responseText === 'string' ? responseText.substring(0, 100) + "..." : responseText)
            }
          }
        }
        
        // Look for reasoning summary in the output
        if (responseData.output && Array.isArray(responseData.output)) {
          const reasoningItem = responseData.output.find((item: any) => item.type === "reasoning")
          if (reasoningItem) {
            console.log("🧠 Full reasoning item structure:", JSON.stringify(reasoningItem, null, 2))
            
            if (reasoningItem.summary && Array.isArray(reasoningItem.summary) && reasoningItem.summary.length > 0) {
              reasoningSummary = reasoningItem.summary.map((s: any) => s.content || s.text || s).join('\n\n')
              console.log("🧠 Found reasoning summary:", reasoningSummary ? reasoningSummary.substring(0, 100) + "..." : "Empty summary")
            } else {
              console.log("🧠 Reasoning item found but summary is empty or missing")
              
              // Try to extract reasoning from other possible fields
              if (reasoningItem.content) {
                reasoningSummary = typeof reasoningItem.content === 'string' ? reasoningItem.content : JSON.stringify(reasoningItem.content)
                console.log("🧠 Found reasoning in content field:", reasoningSummary.substring(0, 100) + "...")
              } else if (reasoningItem.text) {
                reasoningSummary = reasoningItem.text
                console.log("🧠 Found reasoning in text field:", reasoningSummary.substring(0, 100) + "...")
              }
            }
          } else {
            console.log("🧠 No reasoning item found in output array")
          }
        }
        
        console.log("🔍 Final extracted responseText:", responseText ? (typeof responseText === 'string' ? responseText.substring(0, 100) + "..." : JSON.stringify(responseText).substring(0, 100) + "...") : "EMPTY!")
        
        // If we still don't have response text, this is an error
        if (!responseText) {
          console.error("❌ No response text found in OpenAI response!")
          console.error("❌ Full response structure:", JSON.stringify(responseData, null, 2))
          throw new Error("No response text received from OpenAI reasoning model")
        }
        
        // Create a comprehensive reasoning explanation
        const usage = responseData.usage || {}
        const reasoningTokens = usage.output_tokens_details?.reasoning_tokens || 0
        
        let reasoningExplanation = `🧠 **OpenAI Reasoning Model: ${modelConfig.modelId}**

This response was generated using OpenAI's reasoning model, which performs internal reasoning before providing the final answer.`

        // Add reasoning summary if available
        if (reasoningSummary) {
          reasoningExplanation += `\n\n**Reasoning Summary:**\n${reasoningSummary}`
        } else {
          reasoningExplanation += `\n\n**🧠 Internal Reasoning Process:**
The model performed ${reasoningTokens} tokens worth of internal reasoning to generate this response.

**Why the reasoning summary is empty:**
• We're using the correct **Responses API** (\`/v1/responses\`) with proper parameters
• However, **reasoning summaries require special access** from OpenAI
• You need to request the **"Reasoning Summary" feature flag** in your OpenAI Dashboard
• Without this access, the summary field remains \`null\` (this is expected behavior)

**What's happening behind the scenes:**
• The model IS performing internal reasoning (${reasoningTokens} reasoning tokens used)
• OpenAI intentionally keeps the full reasoning steps private for security/IP reasons
• Only accounts with the feature flag can receive limited reasoning summaries
• Even with access, summaries only appear when sufficient reasoning material is generated

**To get reasoning summaries:**
1. **Request access**: Go to OpenAI Dashboard → Limited-access features → "Reasoning Summary"
2. **Wait for approval**: Usually takes 1-2 days
3. **Summaries will then appear**: When the model generates enough reasoning content

**Reasoning Control:**
You can influence reasoning depth using \`reasoning_effort\` (low/medium/high). Currently set to: **${reasoningEffort}**

**Current Status:** ✅ API configured correctly, ⏳ waiting for OpenAI feature access`
        }
        
        // Handle incomplete responses
        if (responseData.status === "incomplete") {
          const reason = responseData.incomplete_details?.reason || "unknown"
          reasoningExplanation += `\n\n⚠️ **Note:** This response was incomplete due to: ${reason}`
          
          if (reason === "max_output_tokens") {
            reasoningExplanation += `\nThe model reached the token limit during generation. Consider increasing max_output_tokens for longer responses.`
          }
        }
        
        // Save the message to database with reasoning explanation
        await handleMessageSave(
          threadId,
          aiMessageId,
          user.id,
          responseText,
          null, // no sources for reasoning models
          { usage: responseData.usage }, // include usage metadata
          modelConfig,
          apiKey!,
          reasoningExplanation,
        )

        // Create a streaming response that emits reasoning events first, then the text
        // This ensures the MessageReasoning component appears immediately
        const stream = new ReadableStream({
          start(controller) {
            try {
              // First, emit reasoning start event
              const reasoningStartEvent = `r:${JSON.stringify({ type: "reasoning-start" })}\n`
              controller.enqueue(new TextEncoder().encode(reasoningStartEvent))
              
              // Then emit the reasoning content (if available)
              if (reasoningExplanation) {
                const reasoningDeltaEvent = `r:${JSON.stringify({ 
                  type: "reasoning-delta", 
                  content: reasoningExplanation 
                })}\n`
                controller.enqueue(new TextEncoder().encode(reasoningDeltaEvent))
              }
              
              // Calculate reasoning duration (estimate based on reasoning tokens)
              const reasoningTokens = responseData.usage?.output_tokens_details?.reasoning_tokens || 0
              const estimatedDuration = Math.max(1, Math.floor(reasoningTokens / 100)) // Rough estimate
              
              // Emit reasoning end event
              const reasoningEndEvent = `r:${JSON.stringify({ 
                type: "reasoning-end", 
                duration: estimatedDuration,
                totalReasoning: reasoningExplanation || ""
              })}\n`
              controller.enqueue(new TextEncoder().encode(reasoningEndEvent))
              
              // Finally, emit the actual response text
              const textChunk = `0:${JSON.stringify(responseText)}\n`
              controller.enqueue(new TextEncoder().encode(textChunk))
              
              // Emit finish event
              const finishChunk = `d:{"finishReason":"stop"}\n`
              controller.enqueue(new TextEncoder().encode(finishChunk))
              
              controller.close()
            } catch (error) {
              console.error("❌ Error in OpenAI reasoning stream:", error)
              controller.error(error)
            }
          }
        })
        
        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        })
      } catch (error) {
        console.error("❌ Error with OpenAI reasoning model:", error)
        
        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes("401")) {
            throw new Error("Invalid OpenAI API key. Please check your API key in Settings.")
          } else if (error.message.includes("429")) {
            throw new Error("OpenAI API rate limit exceeded. Please try again later.")
          } else if (error.message.includes("404")) {
            throw new Error(`OpenAI reasoning model '${modelConfig.modelId}' not found. You may need organization verification to access this model.`)
          }
        }
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

          if (text.includes("<think>") || text.includes("<Thinking>")) {
            console.log("🧠 Detected thinking content in response")
            
            // Extract all thinking blocks
            const thinkMatches = text.match(/<think>([\s\S]*?)<\/think>|<Thinking>([\s\S]*?)<\/Thinking>/g)
            if (thinkMatches) {
              reasoning = thinkMatches
                .map((match: string) => match.replace(/<think>|<\/think>|<Thinking>|<\/Thinking>/g, "").trim())
                .join("\n\n")
              console.log("🧠 Extracted reasoning:", reasoning.substring(0, 100) + "...")
            }

            // Remove thinking tags from the main content
            cleanedText = text
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .replace(/<Thinking>[\s\S]*?<\/Thinking>/g, "")
              .trim()
          }

          // Save to database
          await handleMessageSave(
            threadId,
            aiMessageId,
            user.id,
            cleanedText,
            sources,
            providerMetadata,
            modelConfig,
            apiKey!,
            reasoning
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
          maxRepetitions: 10, // Increased to allow for legitimate thinking tags
          repetitionWindowSize: 50, // Reduced from 100 to detect smaller repetition patterns
          maxResponseLength: 40000,
          timeoutMs: 180000, // 3 minutes for thinking models
          maxSimilarChunks: 20, // Significantly increased for Ollama's incremental streaming
          minRepetitionLength: 15, // Increased to skip short patterns like thinking tags
        })

        // Create a custom readable stream that filters out thinking content AND protects against loops
        const customStream = new ReadableStream({
          async start(controller) {
            const reader = result.toDataStream().getReader()
            let buffer = ""
            let insideThinking = false
            let currentThinkingContent = ""
            let fullResponse = ""
            let reasoning = ""
            let cleanedText = ""
            let sentContent = ""
            let hasEmittedReasoningStart = false
            let lastThinkingEmitTime = 0
            const THINKING_EMIT_DELAY = 100 // Reduced delay for more responsive thinking updates

            const safeEnqueue = (chunk: Uint8Array) => {
              try {
                controller.enqueue(chunk)
              } catch (error) {
                console.warn("⚠️ Failed to enqueue chunk (controller may be closed):", error)
              }
            }

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                // Properly decode the incoming value as UTF-8 text
                const decodedValue = new TextDecoder().decode(value)
                buffer += decodedValue
                let processedChunk = ""
                let i = 0

                while (i < buffer.length) {
                  if (!insideThinking) {
                    // Look for start of thinking (both formats)
                    const thinkStart = Math.min(
                      buffer.indexOf("<think>", i) === -1 ? Infinity : buffer.indexOf("<think>", i),
                      buffer.indexOf("<Thinking>", i) === -1 ? Infinity : buffer.indexOf("<Thinking>", i)
                    )
                    
                    if (thinkStart !== Infinity) {
                      // Add content before thinking
                      processedChunk += buffer.substring(i, thinkStart)
                      insideThinking = true
                      // Skip the appropriate tag length
                      i = thinkStart + (buffer.substring(thinkStart, thinkStart + 9) === "<Thinking>" ? 9 : 7)
                      
                      // Emit a reasoning start event if we haven't already
                      if (!hasEmittedReasoningStart) {
                        safeEnqueue(new TextEncoder().encode(`r:${JSON.stringify({ type: "reasoning-start" })}\n`))
                        hasEmittedReasoningStart = true
                      }
                    } else {
                      // No thinking tag found, add rest of buffer
                      processedChunk += buffer.substring(i)
                      break
                    }
                  } else {
                    // Look for end of thinking (both formats)
                    const thinkEnd = Math.min(
                      buffer.indexOf("</think>", i) === -1 ? Infinity : buffer.indexOf("</think>", i),
                      buffer.indexOf("</Thinking>", i) === -1 ? Infinity : buffer.indexOf("</Thinking>", i)
                    )
                    
                    if (thinkEnd !== Infinity) {
                      // Capture thinking content
                      const newThinkingContent = buffer.substring(i, thinkEnd)
                      currentThinkingContent += newThinkingContent
                      
                      // Emit reasoning delta event with ONLY the new content
                      safeEnqueue(new TextEncoder().encode(`r:${JSON.stringify({ 
                        type: "reasoning-delta", 
                        content: newThinkingContent 
                      })}\n`))
                      
                      // Store for final reasoning and reset buffer
                      reasoning += currentThinkingContent + "\n"
                      currentThinkingContent = ""
                      
                      // Exit thinking mode
                      insideThinking = false
                      // Skip the appropriate tag length
                      i = thinkEnd + (buffer.substring(thinkEnd, thinkEnd + 10) === "</Thinking>" ? 10 : 8)
                      
                      // Emit reasoning end event
                      safeEnqueue(new TextEncoder().encode(`r:${JSON.stringify({ 
                        type: "reasoning-end", 
                        duration: 0, // Will be calculated properly in Google models
                        totalReasoning: reasoning 
                      })}\n`))
                    } else {
                      // Still inside thinking, accumulate content
                      const newThinkingContent = buffer.substring(i)
                      currentThinkingContent += newThinkingContent
                      
                      // Emit reasoning delta event with ONLY the new content
                      safeEnqueue(new TextEncoder().encode(`r:${JSON.stringify({ 
                        type: "reasoning-delta", 
                        content: newThinkingContent 
                      })}\n`))
                      
                      break
                    }
                  }
                }

                // Only emit processed text if we have any
                if (processedChunk && !sentContent.includes(processedChunk)) {
                  const protectionResult = streamProtection.analyzeChunk(processedChunk)
                  if (protectionResult.allowed) {
                    // Send the text chunk directly
                    safeEnqueue(new TextEncoder().encode(`0:${JSON.stringify(processedChunk)}\n`))
                    sentContent += processedChunk
                    cleanedText += processedChunk
                  }
                }

                // Update buffer to remaining unprocessed content
                buffer = buffer.substring(i)
              }

              // Send any remaining buffer content (outside thinking)
              if (buffer && !insideThinking) {
                // Final protection check
                const protectionResult = streamProtection.analyzeChunk(buffer)
                if (protectionResult.allowed) {
                  safeEnqueue(new TextEncoder().encode(`0:${JSON.stringify(buffer)}\n`))
                }
              }

              // Send properly formatted completion marker with finishReason
              safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
            } catch (error) {
              console.error("❌ Error in stream processing:", error)
              controller.error(error)
            }
          }
        })

        return new Response(customStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          }
        })
      })
    } else if (isThinkingModel && modelConfig.provider === "google") {
      // Google thinking models - use AI SDK with proper thinking configuration
      console.log("🧠 Using Google thinking model processing with AI SDK for:", modelConfig.modelId)
      console.log("🤖 Model provider:", modelConfig.provider)
      console.log("🤖 Is thinking model:", isThinkingModel)
      
      const streamOptions = {
        model: aiModel,
        messages: processedMessages,
        system: systemPrompt,
        experimental_attachments: experimental_attachments || undefined,
        // Proper Google thinking configuration using AI SDK
        providerOptions: {
          google: {
            thinkingConfig: {
              includeThoughts: true,
              // thinkingBudget: 2048, // Optional
            },
          } satisfies GoogleGenerativeAIProviderOptions,
        },
        onFinish: async ({ text, finishReason, usage, sources, providerMetadata, reasoning, reasoningDetails }: any) => {
          console.log("🏁 AI generation finished for Google thinking model")
          console.log("🔍 Full response text:", text)
          console.log("🔍 Response length:", text?.length)
          console.log("🔍 Reasoning from AI SDK:", reasoning)
          console.log("🔍 Reasoning details from AI SDK:", reasoningDetails)
          console.log("🔍 Provider metadata:", JSON.stringify(providerMetadata, null, 2))
          
          // Extract reasoning from AI SDK response
          let cleanedText = text
          let extractedReasoning = reasoning || null
          
          // If we have reasoning details, use that as well
          if (reasoningDetails && !extractedReasoning) {
            extractedReasoning = reasoningDetails
          }
          
          // Also check provider metadata for additional reasoning
          if (!extractedReasoning && providerMetadata?.parts) {
            console.log("🔍 Found parts in provider metadata:", providerMetadata.parts.length)
            const thoughtParts = providerMetadata.parts.filter((part: any) => part.thought)
            if (thoughtParts.length > 0) {
              extractedReasoning = thoughtParts.map((part: any) => part.thought).join('\n\n')
              console.log("🧠 Extracted reasoning from provider metadata:", extractedReasoning.substring(0, 200) + "...")
            }
          }
          
          try {
            await handleMessageSave(threadId, aiMessageId, user.id, cleanedText, sources, providerMetadata, modelConfig, apiKey!, extractedReasoning)
            console.log("✅ Google thinking model message saved successfully")
            if (extractedReasoning) {
              console.log("✅ Reasoning was included in save")
            } else {
              console.log("⚠️ No reasoning was saved for Google thinking model")
            }
          } catch (saveError) {
            console.error("❌ Error saving Google thinking model message:", saveError)
          }
        },
      }

      console.log("🚀 Starting Google thinking model generation with AI SDK...")
      console.log("🤖 Final system prompt being sent to AI (Google thinking):", systemPrompt)
      console.log("🔧 Google thinking config:", JSON.stringify(streamOptions.providerOptions, null, 2))

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
              throw new Error(`Google model '${modelConfig.modelId}' not found. Please check the model name.`)
            }
          }
          throw error
        }

                 // Create a custom stream to handle reasoning parts during streaming
         const customStream = new ReadableStream({
           async start(controller) {
             const reader = result.fullStream.getReader()
             const encoder = new TextEncoder()
             let reasoning = ""
             let hasStartedReasoning = false
             let hasFinishedReasoning = false
             let reasoningStartTime = Date.now()

             const safeEnqueue = (chunk: Uint8Array) => {
               try {
                 controller.enqueue(chunk)
               } catch (error) {
                 console.warn("⚠️ Failed to enqueue chunk:", error)
               }
             }

             const safeClose = () => {
               try {
                 controller.close()
               } catch (error) {
                 console.warn("⚠️ Failed to close controller:", error)
               }
             }

             try {
               while (true) {
                 const { done, value } = await reader.read()
                 if (done) break

                 if (value.type === 'reasoning') {
                   // Handle reasoning parts during streaming - STREAM THEM TO CLIENT
                   reasoning += value.textDelta
                   console.log("🧠 Found reasoning during streaming:", value.textDelta.substring(0, 100))
                   
                   if (!hasStartedReasoning) {
                     // Send reasoning start marker
                     const reasoningStartChunk = `r:${JSON.stringify({ type: 'reasoning-start' })}\n`
                     safeEnqueue(encoder.encode(reasoningStartChunk))
                     hasStartedReasoning = true
                     reasoningStartTime = Date.now()
                     console.log("🧠 Started streaming reasoning to client")
                   }
                   
                   // Stream reasoning content to client in real-time
                   const reasoningChunk = `r:${JSON.stringify({ type: 'reasoning-delta', content: value.textDelta })}\n`
                   safeEnqueue(encoder.encode(reasoningChunk))
                   
                 } else if (value.type === 'text-delta') {
                   // If we were streaming reasoning and now we have text, mark reasoning as finished
                   if (hasStartedReasoning && !hasFinishedReasoning) {
                     const reasoningEndTime = Date.now()
                     const thinkingDuration = Math.round((reasoningEndTime - reasoningStartTime) / 1000)
                     const reasoningEndChunk = `r:${JSON.stringify({ 
                       type: 'reasoning-end', 
                       duration: thinkingDuration,
                       totalReasoning: reasoning 
                     })}\n`
                     safeEnqueue(encoder.encode(reasoningEndChunk))
                     hasFinishedReasoning = true
                     console.log(`🧠 Finished streaming reasoning to client (${thinkingDuration}s)`)
                   }
                   
                   // Stream text content to client
                   const streamChunk = `0:${JSON.stringify(value.textDelta)}\n`
                   safeEnqueue(encoder.encode(streamChunk))
                 } else if (value.type === 'finish') {
                   // If reasoning never finished (edge case), finish it now
                   if (hasStartedReasoning && !hasFinishedReasoning) {
                     const reasoningEndTime = Date.now()
                     const thinkingDuration = Math.round((reasoningEndTime - reasoningStartTime) / 1000)
                     const reasoningEndChunk = `r:${JSON.stringify({ 
                       type: 'reasoning-end', 
                       duration: thinkingDuration,
                       totalReasoning: reasoning 
                     })}\n`
                     safeEnqueue(encoder.encode(reasoningEndChunk))
                     console.log(`🧠 Finished reasoning on completion (${thinkingDuration}s)`)
                   }
                   
                   // Send completion marker
                   safeEnqueue(encoder.encode('d:{"finishReason":"stop"}\n'))
                 }
               }

               safeClose()
             } catch (error) {
               console.error("❌ Error in Google thinking stream processing:", error)
               safeClose()
             }
           }
         })

        return new Response(customStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        })
      })
    } else if (needsCustomThinkingProcessor) {
      // OpenRouter thinking models - use custom thinking processor
      console.log("🧠 Using custom thinking processor for OpenRouter model:", modelConfig.modelId)
      console.log("🤖 Model provider:", modelConfig.provider)
      console.log("🤖 Is thinking model:", isThinkingModel)
      
      const streamOptions = {
        model: aiModel,
        messages: processedMessages,
        system: systemPrompt,
        experimental_attachments: experimental_attachments || undefined,
        onFinish: async ({ text, finishReason, usage, sources, providerMetadata }: any) => {
          console.log("🏁 AI generation finished for thinking model")
          console.log("🔍 Full response text:", text)
          console.log("🔍 Response length:", text?.length)
          console.log("🔍 Contains <think>:", text?.includes("<think>"))
          console.log("🔍 Contains </think>:", text?.includes("</think>"))

          // Parse thinking content from text for OpenRouter models
          let cleanedText = text
          let reasoning = null

          if (text.includes("<think>") && text.includes("</think>")) {
            console.log("🧠 Detected thinking content in OpenRouter response")

            // Extract thinking content
            const thinkMatches = text.match(/<think>([\s\S]*?)<\/think>/g)
            if (thinkMatches) {
              reasoning = thinkMatches.map((match: string) => 
                match.replace(/<think>|<\/think>/g, "")
              ).join('\n\n')
              console.log("🧠 Extracted reasoning length:", reasoning.length)
              console.log("🧠 Extracted reasoning preview:", reasoning.substring(0, 200) + "...")
            }

            // Remove thinking tags from the main content
            cleanedText = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
            console.log("🧠 Cleaned text length:", cleanedText.length)
            console.log("🧠 Cleaned text preview:", cleanedText.substring(0, 200) + "...")
          } else {
            console.log("🧠 No thinking tags found in response")
            console.log("🔍 Response preview:", text?.substring(0, 500) + "...")
          }

          try {
            await handleMessageSave(threadId, aiMessageId, user.id, cleanedText, sources, providerMetadata, modelConfig, apiKey!, reasoning)
            console.log("✅ OpenRouter thinking model message saved successfully")
            if (reasoning) {
              console.log("✅ Reasoning was included in save")
            } else {
              console.log("⚠️ No reasoning was saved")
            }
          } catch (saveError) {
            console.error("❌ Error saving OpenRouter thinking model message:", saveError)
          }
        },
      }

      console.log("🚀 Starting OpenRouter thinking model generation...")
      console.log("🤖 Final system prompt being sent to AI (OpenRouter thinking):", systemPrompt)

      // Wrap the stream creation in circuit breaker
      return await streamCircuitBreaker.execute(async () => {
        console.log("🔄 Executing streamText with OpenRouter thinking model")
        let result
        try {
          result = streamText(streamOptions)
          console.log("✅ streamText initialized successfully for OpenRouter thinking model")
        } catch (error) {
          console.error("❌ Error in streamText initialization for OpenRouter thinking model:", error)
          throw error
        }

        // Create a custom data stream that filters out <think> tags during streaming and sends real-time thinking
        const customStream = new ReadableStream({
          async start(controller) {
            const reader = result.toDataStream().getReader()
            const encoder = new TextEncoder()
            const decoder = new TextDecoder()
            
            let textBuffer = ""
            let insideThinking = false
            let thinkingContent = ""
            let hasStartedReasoning = false
            let reasoningStartTime = 0
            let lastThinkingLength = 0

            const safeEnqueue = (chunk: Uint8Array) => {
              try {
                controller.enqueue(chunk)
              } catch (error) {
                console.warn("⚠️ Failed to enqueue chunk:", error)
              }
            }

            const safeClose = () => {
              try {
                controller.close()
              } catch (error) {
                console.warn("⚠️ Failed to close controller:", error)
              }
            }

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  // If we were in thinking mode when stream ended, send reasoning end
                  if (hasStartedReasoning) {
                    const reasoningEndTime = Date.now()
                    const thinkingDuration = Math.round((reasoningEndTime - reasoningStartTime) / 1000)
                    const reasoningEndChunk = `r:${JSON.stringify({ 
                      type: 'reasoning-end', 
                      duration: thinkingDuration,
                      totalReasoning: thinkingContent 
                    })}\n`
                    safeEnqueue(encoder.encode(reasoningEndChunk))
                    console.log(`🧠 Finished streaming OpenRouter reasoning to client (${thinkingDuration}s)`)
                  }
                  break
                }

                const chunk = decoder.decode(value)
                
                // Check if this is a text delta chunk
                if (chunk.startsWith('0:')) {
                  // Extract the text content from the data stream format
                  const textMatch = chunk.match(/0:"([^"]*)"/)
                  if (textMatch) {
                    const textDelta = textMatch[1]
                    textBuffer += textDelta
                    
                    let processedText = ""
                    let i = 0

                    while (i < textBuffer.length) {
                      if (!insideThinking) {
                        // Look for start of thinking
                        const thinkStart = textBuffer.indexOf("<think>", i)
                        if (thinkStart !== -1) {
                          // Add content before thinking to output
                          processedText += textBuffer.substring(i, thinkStart)
                          insideThinking = true
                          i = thinkStart + 7 // Skip "<think>"
                          
                          // Send reasoning start marker if not already sent
                          if (!hasStartedReasoning) {
                            const reasoningStartChunk = `r:${JSON.stringify({ type: 'reasoning-start' })}\n`
                            safeEnqueue(encoder.encode(reasoningStartChunk))
                            hasStartedReasoning = true
                            reasoningStartTime = Date.now()
                            console.log("🧠 Started streaming OpenRouter reasoning to client")
                          }
                        } else {
                          // No thinking tag found, add rest of buffer to output
                          processedText += textBuffer.substring(i)
                          break
                        }
                      } else {
                        // Look for end of thinking
                        const thinkEnd = textBuffer.indexOf("</think>", i)
                        if (thinkEnd !== -1) {
                          // Capture thinking content and stream it to client
                          const newThinkingContent = textBuffer.substring(i, thinkEnd)
                          thinkingContent += newThinkingContent
                          
                          // Send thinking delta if we have new content
                          if (newThinkingContent) {
                            const reasoningChunk = `r:${JSON.stringify({ type: 'reasoning-delta', content: newThinkingContent })}\n`
                            safeEnqueue(encoder.encode(reasoningChunk))
                          }
                          
                          // End of thinking block - send reasoning end
                          const reasoningEndTime = Date.now()
                          const thinkingDuration = Math.round((reasoningEndTime - reasoningStartTime) / 1000)
                          const reasoningEndChunk = `r:${JSON.stringify({ 
                            type: 'reasoning-end', 
                            duration: thinkingDuration,
                            totalReasoning: thinkingContent 
                          })}\n`
                          safeEnqueue(encoder.encode(reasoningEndChunk))
                          console.log(`🧠 Finished streaming OpenRouter reasoning block to client (${thinkingDuration}s)`)
                          
                          insideThinking = false
                          hasStartedReasoning = false // Reset for potential multiple thinking blocks
                          i = thinkEnd + 8 // Skip "</think>"
                        } else {
                          // Still inside thinking, capture content and stream to client
                          const newThinkingContent = textBuffer.substring(i)
                          thinkingContent += newThinkingContent
                          
                          // Send thinking delta for real-time updates
                          if (newThinkingContent) {
                            const reasoningChunk = `r:${JSON.stringify({ type: 'reasoning-delta', content: newThinkingContent })}\n`
                            safeEnqueue(encoder.encode(reasoningChunk))
                          }
                          
                          break
                        }
                      }
                    }

                    // Send processed text delta (without thinking content) to client
                    if (processedText) {
                      // Send properly formatted text chunk directly, not the raw data stream format
                      safeEnqueue(encoder.encode(processedText))
                    }

                    // Update buffer to remaining unprocessed content
                    textBuffer = textBuffer.substring(i)
                  } else {
                    // For non-text delta chunks, only pass through specific needed chunks
                    if (chunk.includes('"finishReason"') || chunk.includes('"usage"')) {
                      safeEnqueue(value)
                    }
                  }
                } else {
                  // Pass through non-text chunks (like finish reason, etc.) but filter out messageId chunks
                  if (chunk.includes('"finishReason"') || chunk.includes('"usage"')) {
                    safeEnqueue(value)
                  }
                }
              }

              safeClose()
            } catch (error) {
              console.error("❌ Error in OpenRouter thinking stream processing:", error)
              safeClose()
            }
          }
        })

        return new Response(customStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        })
      })
    } else {
      // Regular models - use standard processing with protection
      console.log("🤖 Using standard model processing for:", modelConfig.modelId)
      console.log("🤖 Model provider:", modelConfig.provider)
      console.log("🤖 Is thinking model:", isThinkingModel)
      
      // Prepare tools for OpenAI web search
      let tools = undefined
      let toolChoice = undefined
      
      console.log("🔍 Web search debug info:", {
        provider: modelConfig.provider,
        webSearchEnabled,
        modelSupportsSearch,
        shouldAddWebSearch: modelConfig.provider === "openai" && webSearchEnabled && modelSupportsSearch
      })
      
      if (webSearchEnabled && modelSupportsSearch) {
        console.log("🔍 Adding Serper web search tool")
        try {
          // Check if Serper API key is available
          const serperApiKey = process.env.SERPER_API_KEY
          if (!serperApiKey) {
            console.warn("⚠️ SERPER_API_KEY not found, skipping web search tool")
          } else {
            tools = {
              search: search,
            }
            console.log("✅ Serper web search tool configured successfully")
          }
        } catch (error) {
          console.error("❌ Error configuring Serper web search tool:", error)
        }
      } else {
        console.log("🚫 Web search tool not added - conditions not met")
      }

      const streamOptions = {
        model: aiModel,
        messages: processedMessages,
        system: systemPrompt,
        experimental_attachments: experimental_attachments || undefined,
        tools: tools,
        toolChoice: toolChoice,
        onFinish: async ({ text, finishReason, usage, sources, providerMetadata, toolResults }: any) => {
          console.log("🏁 AI generation finished")
          console.log("🔧 Tool results:", toolResults)
          
          // Handle thinking content extraction for deepseek models
          let cleanedText = text
          let reasoning = null
          
          if (isThinkingModel && modelConfig.provider === "openrouter" && text) {
            console.log("🧠 Processing thinking content for deepseek model")
            console.log("🔍 Original text length:", text.length)
            console.log("🔍 Contains <think>:", text.includes("<think>"))
            console.log("🔍 Contains </think>:", text.includes("</think>"))
            
            if (text.includes("<think>") && text.includes("</think>")) {
              console.log("🧠 Extracting thinking content from deepseek response")
              
              // Extract thinking content
              const thinkMatches = text.match(/<think>([\s\S]*?)<\/think>/g)
              if (thinkMatches) {
                reasoning = thinkMatches.map((match: string) => 
                  match.replace(/<think>|<\/think>/g, "")
                ).join('\n\n')
                console.log("🧠 Extracted reasoning length:", reasoning.length)
                console.log("🧠 Extracted reasoning preview:", reasoning.substring(0, 200) + "...")
              }
              
              // Remove thinking tags from the main content
              cleanedText = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
              console.log("🧠 Cleaned text length:", cleanedText.length)
              console.log("🧠 Cleaned text preview:", cleanedText.substring(0, 200) + "...")
            } else {
              console.log("🧠 No thinking tags found in deepseek response")
            }
          }
          
          // Extract sources from tool results if available
          let extractedSources: any[] = []
          
          if (toolResults && toolResults.length > 0) {
            for (const toolResult of toolResults) {
              console.log("🔧 Processing tool result:", {
                toolName: toolResult.toolName,
                resultType: typeof toolResult.result,
                hasResults: !!(toolResult.result?.results)
              })
              
              if (toolResult.toolName === "search" && toolResult.result?.results) {
                const results = toolResult.result.results
                const query = toolResult.result.query
                
                console.log("🔍 Found web search results in tool result:", {
                  query,
                  resultsCount: results.length,
                  resultsPreview: results.slice(0, 2).map((r: any) => ({ title: r.title, url: r.url }))
                })
                
                // Convert tool results to expected source format
                extractedSources = results.map((result: any) => ({
                  title: result.title,
                  snippet: result.content,
                  url: result.url,
                  source: result.domain,
                  domain: result.domain,
                  query: query
                }))
              }
            }
          }
          
          // Get sources from global variables as fallback
          const webSearchSources = global.lastSearchSources || []
          const webSearchQuery = global.lastSearchQuery || null
          
          if (webSearchSources.length > 0) {
            console.log("🔍 Web search sources from global fallback:", {
              sourcesCount: webSearchSources.length,
              query: webSearchQuery,
              sourcesPreview: webSearchSources.slice(0, 2).map((s: any) => ({ title: s.title, url: s.url }))
            })
          }
          
          // Clear global sources after use
          global.lastSearchSources = []
          global.lastSearchQuery = null
          
          console.log("🔍 AI SDK sources:", sources)
          console.log("🔍 Sources type:", typeof sources)
          console.log("🔍 Sources length:", sources?.length)
          console.log("🔍 Finish reason:", finishReason)
          console.log("🔍 Provider metadata:", providerMetadata)
          
          // Use extracted sources from tools first, then web search sources, then AI SDK sources
          const finalSources = extractedSources.length > 0 ? extractedSources 
                               : webSearchSources.length > 0 ? webSearchSources 
                               : sources
          
          console.log("🎯 Final sources to save:", {
            sourcesCount: finalSources?.length || 0,
            sourceType: extractedSources.length > 0 ? "tool_results" 
                        : webSearchSources.length > 0 ? "global_fallback" 
                        : "ai_sdk"
          })
          
          try {
            await handleMessageSave(threadId, aiMessageId, user.id, cleanedText, finalSources, providerMetadata, modelConfig, apiKey!, reasoning)
            console.log("✅ Message saved successfully")
            if (reasoning) {
              console.log("✅ Reasoning was included in save for deepseek model")
            }
          } catch (saveError) {
            console.error("❌ Error saving message:", saveError)
          }
        },
      }

      console.log("🔍 Stream options debug:", {
        hasTools: !!tools,
        toolsKeys: tools ? Object.keys(tools) : [],
        hasToolChoice: !!toolChoice,
        modelId: modelConfig.modelId,
        messagesCount: processedMessages.length
      })

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

        // For deepseek thinking models, use the standard response but rely on onFinish for thinking extraction
        if (isThinkingModel && modelConfig.provider === "openrouter") {
          console.log("🧠 Using standard stream for deepseek thinking model with post-processing")
        }
        
        {
          // For regular models, use the AI SDK's built-in data stream response
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
        }
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

async function handleOllamaChat(req: NextRequest, messages: any[], model: string, headersList: Headers, data?: any, studyMode: boolean = false) {
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
    console.log("🎓 Study mode:", !!studyMode)

    // Get the Ollama base URL from headers (sent by frontend) or fallback to environment/default
    const ollamaUrl = headersList.get('x-ollama-base-url') || 
                      headersList.get('X-Ollama-Base-URL') || 
                      process.env.OLLAMA_URL || 
                      "http://localhost:11434"
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
    const reasoningEffort = data?.reasoningEffort || "medium"
    console.log("👤 Ollama user preferences:", userPreferences ? "present" : "not found")

    // Create system prompt for Ollama
    const systemPrompt = getSystemPrompt(false, false, userEmail, threadPersona, userPreferences, isThinkingModel, modelConfig.provider, modelConfig.modelId, studyMode)
    console.log("📝 Ollama generated system prompt preview:", systemPrompt.substring(0, 200) + "...")

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
        maxRepetitions: 10,
        repetitionWindowSize: 50,
        maxResponseLength: 40000,
        timeoutMs: 180000,
        maxSimilarChunks: 20,
        minRepetitionLength: 15,
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
          let insideThinking = false
          let fullResponse = ""
          let reasoning = null
          let cleanedText = ""
          let responseBuffer = ""

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

              // Properly decode the incoming value as UTF-8 text
              const decodedValue = new TextDecoder().decode(value)
              responseBuffer += decodedValue
              let processedChunk = ""
              let i = 0

              while (i < responseBuffer.length) {
                if (isClosed) break

                try {
                  const data = JSON.parse(responseBuffer)
                  if (data.message?.content) {
                    const content = data.message.content
                    fullResponse += content

                    // For thinking models, we need to handle <think> tags
                    if (!insideThinking) {
                      // Check if this token starts a thinking section
                      if (content.includes("<think>")) {
                        const parts = content.split("<think>")
                        const beforeThink = parts[0]
                        
                        // Send content before <think> tag
                        if (beforeThink) {
                          const protectionResult = streamProtection.analyzeChunk(beforeThink)
                          if (!protectionResult.allowed) {
                            console.warn("🛡️ Ollama stream protection triggered:", protectionResult.reason)
                            const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                            const encodedError = `0:${JSON.stringify(errorMsg)}\n`
                            safeEnqueue(new TextEncoder().encode(encodedError))
                            safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                            safeClose()
                            return
                          }
                          const streamChunk = `0:${JSON.stringify(beforeThink)}\n`
                          safeEnqueue(new TextEncoder().encode(streamChunk))
                        }
                        
                        // Enter thinking mode
                        insideThinking = true
                        
                        // Handle any thinking content in this same token
                        if (parts.length > 1) {
                          const thinkingPart = parts.slice(1).join("<think>")
                          if (thinkingPart.includes("</think>")) {
                            const thinkParts = thinkingPart.split("</think>")
                            const thinkContent = thinkParts[0]
                            if (!reasoning) reasoning = thinkContent
                            else reasoning += thinkContent
                            
                            // Exit thinking mode
                            insideThinking = false
                            
                            // Send any content after </think>
                            if (thinkParts.length > 1) {
                              const afterThink = thinkParts.slice(1).join("</think>")
                              if (afterThink) {
                                const protectionResult = streamProtection.analyzeChunk(afterThink)
                                if (!protectionResult.allowed) {
                                  console.warn("🛡️ Ollama stream protection triggered:", protectionResult.reason)
                                  const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                                  const encodedError = `0:${JSON.stringify(errorMsg)}\n`
                                  safeEnqueue(new TextEncoder().encode(encodedError))
                                  safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                                  safeClose()
                                  return
                                }
                                const streamChunk = `0:${JSON.stringify(afterThink)}\n`
                                safeEnqueue(new TextEncoder().encode(streamChunk))
                              }
                            }
                          } else {
                            // Still inside thinking, add to reasoning
                            if (!reasoning) reasoning = thinkingPart
                            else reasoning += thinkingPart
                          }
                        }
                      } else {
                        // Normal content outside thinking - send it directly
                        const protectionResult = streamProtection.analyzeChunk(content)
                        if (!protectionResult.allowed) {
                          console.warn("🛡️ Ollama stream protection triggered:", protectionResult.reason)
                          const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                          const encodedError = `0:${JSON.stringify(errorMsg)}\n`
                          safeEnqueue(new TextEncoder().encode(encodedError))
                          safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                          safeClose()
                          return
                        }
                        const streamChunk = `0:${JSON.stringify(content)}\n`
                        safeEnqueue(new TextEncoder().encode(streamChunk))
                      }
                    } else {
                      // We're inside thinking - check for end tag
                      if (content.includes("</think>")) {
                        const parts = content.split("</think>")
                        const thinkContent = parts[0]
                        if (!reasoning) reasoning = thinkContent
                        else reasoning += thinkContent
                        
                        // Exit thinking mode
                        insideThinking = false
                        
                        // Send any content after </think>
                        if (parts.length > 1) {
                          const afterThink = parts.slice(1).join("</think>")
                          if (afterThink) {
                            const protectionResult = streamProtection.analyzeChunk(afterThink)
                            if (!protectionResult.allowed) {
                              console.warn("🛡️ Ollama stream protection triggered:", protectionResult.reason)
                              const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                              const encodedError = `0:${JSON.stringify(errorMsg)}\n`
                              safeEnqueue(new TextEncoder().encode(encodedError))
                              safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                              safeClose()
                              return
                            }
                            const streamChunk = `0:${JSON.stringify(afterThink)}\n`
                            safeEnqueue(new TextEncoder().encode(streamChunk))
                          }
                        }
                      } else {
                        // Still inside thinking, add to reasoning
                        if (!reasoning) reasoning = content
                        else reasoning += content
                      }
                    }
                  }

                  if (data.done) {
                    safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))

                    // Save the message with reasoning
                    if (threadId && user) {
                      // Clean the full response by removing thinking tags
                      cleanedText = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, "").trim()

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
          let fullResponse = "" // Accumulate the full response for saving

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

              // Properly decode the incoming value as UTF-8 text
              const decodedValue = new TextDecoder().decode(value)
              buffer += decodedValue
              let processedChunk = ""
              let i = 0

              while (i < buffer.length) {
                if (isClosed) break

                try {
                  const data = JSON.parse(buffer)
                  if (data.message?.content) {
                    const content = data.message.content

                    // Accumulate the full response
                    fullResponse += content

                    // Check with stream protection
                    const protectionResult = streamProtection.analyzeChunk(content)

                    if (!protectionResult.allowed) {
                      console.warn("🛡️ Ollama stream protection triggered:", protectionResult.reason)
                      console.log("📊 Ollama stream stats:", streamProtection.getStats())

                      // Send error message to client
                      const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
                      const encodedError = `0:${JSON.stringify(errorMsg)}\n`
                      safeEnqueue(new TextEncoder().encode(encodedError))

                      // Terminate the stream
                      safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))
                      safeClose()
                      return
                    }

                    // Format as AI SDK compatible stream
                    const streamChunk = `0:${JSON.stringify(content)}\n`
                    safeEnqueue(new TextEncoder().encode(streamChunk))
                  }
                  if (data.done) {
                    safeEnqueue(new TextEncoder().encode('d:{"finishReason":"stop"}\n'))

                    // Save the message for non-thinking Ollama models (similar to thinking models)
                    if (threadId && user && fullResponse && fullResponse.trim().length > 0) {
                      await handleMessageSave(
                        threadId,
                        aiMessageId,
                        user.id,
                        fullResponse.trim(),
                        null, // sources
                        null, // providerMetadata
                        modelConfig,
                        "", // Ollama doesn't use API keys
                        null, // no reasoning for non-thinking models
                      )
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
    }
  } catch (error) {
    console.error("💥 Ollama handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get system prompt
function getSystemPrompt(
  webSearchEnabled: boolean,
  modelSupportsSearch: boolean,
  userEmail: string,
  persona: any = null,
  userPreferences: any = null,
  isThinkingModel: boolean = false,
  modelProvider: string = "",
  modelId: string = "",
  studyMode: boolean = false,
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

  // Add study & learn mode instructions if enabled
  if (studyMode) {
    basePrompt += `\n\nYou are in \"Study & Learn\" mode.\n- Do not provide direct answers unless the user explicitly asks.\n- Guide the user with targeted questions, hints, and examples to encourage critical thinking.\n- Use professional teaching methods: assess understanding, scaffold explanations, and prompt the user to summarize.\n- Respond with empathy and adjust to the user's pace.\n- If the user asks to exit this mode or requests a direct answer, comply respectfully.`
  }

  // Add reasoning effort instructions for thinking models
  let reasoningInstructions = ""
  if (isThinkingModel) {
    const effortDescriptions = {
      low: "Be concise and direct. Focus on providing quick, accurate answers without extensive analysis.",
      medium: "Balance thoroughness with efficiency. Provide well-reasoned responses with appropriate detail and analysis.",
      high: "Think deeply and thoroughly. Consider multiple perspectives, analyze implications, and provide comprehensive reasoning. Take time to consider edge cases and nuances."
    }
    
    reasoningInstructions = `

🧠 REASONING APPROACH: MEDIUM EFFORT
${effortDescriptions.medium}

For thinking models that support structured reasoning:
- Use your internal reasoning capabilities to think through problems step by step
- Consider multiple approaches and their trade-offs
- Analyze the context and implications of your response
- Show your reasoning process when helpful to the user
`
  }

  const finalPrompt = `${basePrompt}${personalizationSection}${reasoningInstructions}

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

WORKFLOW EXECUTION SYSTEM:
When you receive a message containing "[EXECUTE_WORKFLOW]" and "[/EXECUTE_WORKFLOW]", you should:
1. Parse the workflow data from the structured format
2. Execute each step sequentially with real-time progress indicators
3. Use web search when WEB_SEARCH is true for individual steps AND you have search capabilities
4. Display results clearly with proper formatting
5. Show completion status at the end

IMPORTANT: Do NOT acknowledge the workflow execution message itself. Start directly with the workflow execution.

For workflow steps:
- Start with: 🚀 **Executing workflow: [WORKFLOW_NAME]**
- For each step: 
  - ⚡ **Step X: [Step Name]**
  - If WEB_SEARCH is true for the step: 🔍 **Searching the web...** (actually search for relevant information)
  - 🤖 **Processing with AI...**
  - **Result:** [detailed content based on step prompt and any search results]
  - Use "---" separator between steps
- End with: 🎉 **Workflow completed successfully!**

Parse the workflow data from these fields:
- WORKFLOW_NAME: The name of the workflow
- WORKFLOW_DESCRIPTION: Description of what the workflow does
- INPUT_DATA: JSON object with input variables
- WORKFLOW_STEPS: Individual step definitions with WEB_SEARCH flags
- WEB_SEARCH_ENABLED: Global web search setting
- SELECTED_MODEL: The model being used

CRITICAL: When a step has WEB_SEARCH: true, you MUST actually search for information relevant to that step's prompt and input data. Use your search grounding capabilities to find real-time information.

IMPORTANT: For content generation steps (like writing blog posts, articles, etc.), you MUST generate the FULL content requested. Do NOT use placeholders like "(This section would contain...)" or "(Due to length constraints...)". Always provide complete, detailed content as requested. If a step asks for an 800-1200 word blog post, write the entire blog post with that word count.

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
        console.log("💾 Adding sources to message parts:", {
          sourcesCount: sources.length,
          sourcesPreview: sources.slice(0, 2).map((s: any) => ({
            url: s?.url,
            title: s?.title,
            snippet: s?.snippet?.substring(0, 100)
          }))
        })
        messageParts.push({ type: "sources", sources } as any)
      } else {
        console.log("💾 No sources to add to message parts:", {
          hasSources: !!sources,
          sourcesType: typeof sources,
          sourcesLength: sources?.length
        })
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
