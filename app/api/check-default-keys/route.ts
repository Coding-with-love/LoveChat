import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { provider } = await req.json()
    
    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 })
    }

    const normalizedProvider = provider.toLowerCase()
    let hasDefaultKey = false

    switch (normalizedProvider) {
      case "openai":
        hasDefaultKey = !!process.env.OPENAI_API_KEY
        break
      case "google":
        hasDefaultKey = !!process.env.GOOGLE_API_KEY
        break
      case "openrouter":
        hasDefaultKey = !!process.env.OPENROUTER_API_KEY
        break
      case "ollama":
        hasDefaultKey = true // Ollama doesn't need API keys
        break
      default:
        hasDefaultKey = false
    }

    console.log("🔍 Default key check for provider:", normalizedProvider, "Has key:", hasDefaultKey)

    return NextResponse.json({ hasDefaultKey })
  } catch (error) {
    console.error("❌ Error checking default keys:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 