import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { getModelConfig } from "@/lib/models"
import { z } from "zod"

const SummarySchema = z.object({
  summary: z.string().describe("A concise summary of the conversation (2-3 sentences)"),
  actionItems: z.array(z.string()).describe("List of actionable items or tasks mentioned"),
  keyPoints: z.array(z.string()).describe("Important points, decisions, or insights from the conversation"),
  topics: z.array(z.string()).describe("Main topics discussed"),
})

export async function POST(request: NextRequest) {
  console.log("🚀 Starting summarize-conversation API")

  try {
    const body = await request.json()
    const { threadId, forceRegenerate = false, model } = body

    console.log("📝 Request data:", { threadId, forceRegenerate, model })

    if (!threadId) {
      console.log("❌ Missing threadId")
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 })
    }

    if (!model) {
      console.log("❌ Missing model")
      return NextResponse.json({ error: "Model is required" }, { status: 400 })
    }

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    console.log("🔐 Auth header present:", !!authHeader)

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Missing or invalid auth header")
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    // Create Supabase client with service role for server-side operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("🔧 Supabase config:", {
      url: !!supabaseUrl,
      serviceKey: !!supabaseServiceKey,
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log("❌ Missing Supabase environment variables")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the current user from the JWT token
    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    console.log("👤 User auth result:", {
      userId: user?.id,
      error: userError?.message,
    })

    if (userError || !user) {
      console.log("❌ Authentication failed:", userError)
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    // Check if conversation_summaries table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from("conversation_summaries")
      .select("count")
      .limit(1)

    console.log("🗄️ Table check:", {
      exists: !tableError,
      error: tableError?.message,
    })

    if (tableError) {
      console.log("❌ Table doesn't exist or access denied:", tableError)
      return NextResponse.json(
        {
          error: "Database table not found",
          details: tableError.message,
        },
        { status: 500 },
      )
    }

    // Check if we already have a summary for this thread
    if (!forceRegenerate) {
      console.log("🔍 Checking for existing summary...")

      const { data: existingSummary, error: summaryError } = await supabase
        .from("conversation_summaries")
        .select("*")
        .eq("thread_id", threadId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      console.log("📋 Existing summary check:", {
        found: !!existingSummary,
        error: summaryError?.code,
      })

      if (existingSummary) {
        console.log("✅ Returning existing summary")
        return NextResponse.json({
          id: existingSummary.id,
          threadId: existingSummary.thread_id,
          summary: existingSummary.summary,
          actionItems: existingSummary.action_items || [],
          keyPoints: existingSummary.key_points || [],
          topics: existingSummary.topics || [],
          messageCount: existingSummary.message_count,
          createdAt: existingSummary.created_at,
        })
      }
    }

    // Fetch messages from the thread
    console.log("📨 Fetching messages...")

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, content, role, created_at, user_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })

    console.log("📨 Messages result:", {
      count: messages?.length || 0,
      error: messagesError?.message,
    })

    if (messagesError) {
      console.error("❌ Error fetching messages:", messagesError)
      return NextResponse.json(
        {
          error: "Failed to fetch messages",
          details: messagesError.message,
        },
        { status: 500 },
      )
    }

    if (!messages || messages.length === 0) {
      console.log("❌ No messages found")
      return NextResponse.json({ error: "No messages found in this thread" }, { status: 404 })
    }

    // Format the conversation for the AI
    const conversation = messages
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n")

    // Truncate if too long
    const maxLength = model.startsWith("gpt-4") ? 50000 : 30000
    const truncatedConversation =
      conversation.length > maxLength
        ? conversation.slice(0, maxLength) + "\n\n[Conversation truncated due to length...]"
        : conversation

    console.log("📝 Conversation prepared:", {
      originalLength: conversation.length,
      truncatedLength: truncatedConversation.length,
    })

    // Get model configuration
    const modelConfig = getModelConfig(model)
    console.log("🤖 Model config:", {
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
    })

    // Get the appropriate API key from headers
    let apiKey: string | null = null

    switch (modelConfig.provider) {
      case "openai":
        apiKey = request.headers.get("x-openai-api-key")
        break
      case "google":
        apiKey = request.headers.get("x-google-api-key")
        break
      case "openrouter":
        apiKey = request.headers.get("x-openrouter-api-key")
        break
      case "ollama":
        // Ollama doesn't need an API key
        break
    }

    console.log("🔑 API key check:", {
      provider: modelConfig.provider,
      hasKey: !!apiKey,
    })

    if (!apiKey && modelConfig.provider !== "ollama") {
      console.log("❌ Missing API key for provider:", modelConfig.provider)
      return NextResponse.json(
        {
          error: `API key required for ${modelConfig.provider}`,
        },
        { status: 400 },
      )
    }

    // Create the appropriate AI client
    let aiModel

    try {
      switch (modelConfig.provider) {
        case "openai":
          const openai = createOpenAI({ apiKey: apiKey! })
          aiModel = openai(modelConfig.modelId)
          break

        case "google":
          const google = createGoogleGenerativeAI({ apiKey: apiKey! })
          aiModel = google(modelConfig.modelId)
          break

        case "openrouter":
          const openrouter = createOpenAI({
            apiKey: apiKey!,
            baseURL: "https://openrouter.ai/api/v1",
          })
          aiModel = openrouter(modelConfig.modelId)
          break

        case "ollama":
          const ollamaBaseUrl = request.headers.get("x-ollama-base-url") || "http://localhost:11434"
          const ollama = createOpenAI({
            baseURL: `${ollamaBaseUrl}/v1`,
            apiKey: "ollama",
          })
          aiModel = ollama(modelConfig.modelId)
          break

        default:
          console.log("❌ Unsupported provider:", modelConfig.provider)
          return NextResponse.json(
            {
              error: `Unsupported provider: ${modelConfig.provider}`,
            },
            { status: 400 },
          )
      }
    } catch (error) {
      console.error("❌ Error creating AI client:", error)
      return NextResponse.json(
        {
          error: "Failed to initialize AI model",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    console.log("🤖 Generating summary...")

    // Generate structured summary
    const { object: summaryData } = await generateObject({
      model: aiModel,
      schema: SummarySchema,
      prompt: `Please analyze this conversation and provide a structured summary.

Focus on being practical and actionable. Extract:
1. A concise summary (2-3 sentences) of what was discussed
2. Any actionable items, tasks, or next steps mentioned
3. Key points, decisions, or important insights
4. Main topics that were covered

If there are no action items or key points, return empty arrays.

Here's the conversation:

${truncatedConversation}`,
    })

    console.log("✅ Summary generated:", {
      summaryLength: summaryData.summary.length,
      actionItemsCount: summaryData.actionItems.length,
      keyPointsCount: summaryData.keyPoints.length,
      topicsCount: summaryData.topics.length,
    })

    // Store the summary in the database
    console.log("💾 Saving summary to database...")

    const insertData = {
      thread_id: threadId,
      user_id: user.id,
      summary: summaryData.summary,
      action_items: summaryData.actionItems,
      key_points: summaryData.keyPoints,
      topics: summaryData.topics,
      message_count: messages.length,
    }

    console.log("📝 Insert data:", insertData)

    const { data: savedSummary, error: saveError } = await supabase
      .from("conversation_summaries")
      .insert(insertData)
      .select()
      .single()

    if (saveError) {
      console.error("❌ Error saving summary:", saveError)
      return NextResponse.json(
        {
          error: "Failed to save summary",
          details: saveError.message,
          code: saveError.code,
        },
        { status: 500 },
      )
    }

    console.log("✅ Summary saved successfully:", savedSummary.id)

    return NextResponse.json({
      id: savedSummary.id,
      threadId: savedSummary.thread_id,
      summary: savedSummary.summary,
      actionItems: savedSummary.action_items || [],
      keyPoints: savedSummary.key_points || [],
      topics: savedSummary.topics || [],
      messageCount: savedSummary.message_count,
      createdAt: savedSummary.created_at,
    })
  } catch (error) {
    console.error("❌ Unexpected error in summarize-conversation route:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
