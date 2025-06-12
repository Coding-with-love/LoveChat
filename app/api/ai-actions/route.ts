import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { supabaseServer } from "@/lib/supabase/server"
import { openai } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { getModelConfig } from "@/lib/models"

export async function POST(request: NextRequest) {
  try {
    console.log("🤖 AI Actions API called")

    // Get headers
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ Missing or invalid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Create Supabase client and verify user
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("❌ Failed to parse request body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { action, text, targetLanguage, model } = body

    console.log("📝 Processing action:", action, "with model:", model, "for text length:", text?.length)

    if (!action || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const validActions = ["explain", "translate", "rephrase", "summarize"]
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get model configuration with error handling
    let modelConfig
    try {
      modelConfig = getModelConfig(model || "gemini-2.0-flash-exp")
      console.log("🎯 Model config:", modelConfig)
    } catch (error) {
      console.error("❌ Failed to get model config:", error)
      return NextResponse.json({ error: "Invalid model configuration" }, { status: 400 })
    }

    // Get API key based on provider
    let apiKey: string | undefined
    switch (modelConfig.provider) {
      case "openai":
        apiKey = headersList.get(modelConfig.headerKey) || process.env.OPENAI_API_KEY
        break
      case "google":
        apiKey = headersList.get(modelConfig.headerKey) || process.env.GOOGLE_API_KEY
        break
      case "openrouter":
        apiKey = headersList.get(modelConfig.headerKey) || process.env.OPENROUTER_API_KEY
        break
      case "ollama":
        // Ollama doesn't need an API key
        break
      default:
        console.error("❌ Unsupported provider:", modelConfig.provider)
        return NextResponse.json({ error: `Unsupported provider: ${modelConfig.provider}` }, { status: 400 })
    }

    if (modelConfig.provider !== "ollama" && !apiKey) {
      console.error("❌ Missing API key for provider:", modelConfig.provider)
      return NextResponse.json({ error: `${modelConfig.provider} API key is required` }, { status: 400 })
    }

    // Generate appropriate prompt based on action
    const prompt = createPromptForAction(action, text, targetLanguage)
    console.log("📝 Generated prompt:", prompt.slice(0, 100) + "...")

    console.log("🚀 Generating AI response...")

    // Create AI model instance and generate response
    try {
      let result: string

      switch (modelConfig.provider) {
        case "openai":
          console.log("🔵 Using OpenAI model:", modelConfig.modelId)
          try {
            const openaiModel = openai(modelConfig.modelId)
            const openaiResponse = await generateText({
              model: openaiModel,
              prompt,
              maxTokens: 500,
              temperature: action === "translate" ? 0.1 : 0.7,
              providerOptions: {
                openai: {
                  apiKey: apiKey as string,
                },
              },
            })
            result = openaiResponse.text
          } catch (error) {
            console.error("❌ OpenAI API error:", error)
            throw error
          }
          break

        case "google":
          console.log("🟢 Using Google model:", modelConfig.modelId)
          try {
            const google = createGoogleGenerativeAI({ apiKey: apiKey as string })
            const googleModel = google(modelConfig.modelId)
            const googleResponse = await generateText({
              model: googleModel,
              prompt,
              maxTokens: 500,
              temperature: action === "translate" ? 0.1 : 0.7,
            })
            result = googleResponse.text
          } catch (error) {
            console.error("❌ Google API error:", error)
            throw error
          }
          break

        case "openrouter":
          console.log("🟣 Using OpenRouter model:", modelConfig.modelId)
          try {
            const openrouter = createOpenRouter({ apiKey: apiKey as string })
            const openrouterModel = openrouter(modelConfig.modelId)
            const openrouterResponse = await generateText({
              model: openrouterModel,
              prompt,
              maxTokens: 500,
              temperature: action === "translate" ? 0.1 : 0.7,
            })
            result = openrouterResponse.text
          } catch (error) {
            console.error("❌ OpenRouter API error:", error)
            throw error
          }
          break

        case "ollama":
          console.log("🟡 Using Ollama model:", modelConfig.modelId)
          try {
            const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434"
            const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: modelConfig.modelId,
                prompt,
                stream: false,
              }),
            })

            if (!ollamaResponse.ok) {
              throw new Error(`Ollama request failed: ${ollamaResponse.status}`)
            }

            const ollamaResult = await ollamaResponse.json()
            result = ollamaResult.response
          } catch (error) {
            console.error("❌ Ollama API error:", error)
            throw error
          }
          break

        default:
          throw new Error(`Unsupported provider: ${modelConfig.provider}`)
      }

      console.log("✅ AI response generated, length:", result?.length)

      // Track the action in database (optional)
      try {
        await supabaseServer.from("ai_actions").insert({
          user_id: user.id,
          action_type: action,
          model_used: model,
          input_text: text.slice(0, 1000),
          output_text: result.slice(0, 1000),
          target_language: targetLanguage,
          created_at: new Date().toISOString(),
        })
      } catch (dbError) {
        console.error("Failed to track AI action:", dbError)
        // Don't fail the request if tracking fails
      }

      return NextResponse.json({
        result,
        action,
        originalText: text,
        modelUsed: model,
      })
    } catch (aiError) {
      console.error("❌ AI generation error:", aiError)
      return NextResponse.json(
        {
          error: "Failed to generate AI response",
          details: aiError instanceof Error ? aiError.message : "Unknown AI error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("💥 AI Actions API error:", error)
    return NextResponse.json(
      {
        error: "Failed to process AI action",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function createPromptForAction(action: string, text: string, targetLanguage?: string): string {
  switch (action) {
    case "explain":
      return `Please explain the following text in simple, clear terms. Break down any complex concepts and provide context where helpful:\n\n"${text}"`
    case "translate":
      const language = targetLanguage || "Spanish"
      return `Please translate the following text to ${language}. Provide only the translation without any additional commentary:\n\n"${text}"`
    case "rephrase":
      return `Please rephrase the following text while maintaining the same meaning. Make it clearer and more concise:\n\n"${text}"`
    case "summarize":
      return `Please provide a concise summary of the following text, highlighting the key points:\n\n"${text}"`
    default:
      return `Process the following text: "${text}"`
  }
}
