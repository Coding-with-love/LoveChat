import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Ollama test endpoint called")

    const headersList = await headers()
    
    // Get the Ollama base URL from headers or fallback
    const ollamaUrl = headersList.get('x-ollama-base-url') || 
                      headersList.get('X-Ollama-Base-URL') || 
                      process.env.OLLAMA_URL || 
                      "http://localhost:11434"

    console.log("🦙 Testing Ollama URL:", ollamaUrl)
    console.log("🦙 Available headers:", Object.fromEntries(headersList.entries()))

    // Test connection to Ollama
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error("❌ Ollama connection failed:", response.status, response.statusText)
        return NextResponse.json({
          success: false,
          error: `Ollama connection failed: ${response.status} ${response.statusText}`,
          ollamaUrl,
          headers: Object.fromEntries(headersList.entries())
        })
      }

      const data = await response.json()
      console.log("✅ Ollama connection successful, models:", data.models?.length || 0)

      return NextResponse.json({
        success: true,
        ollamaUrl,
        modelsCount: data.models?.length || 0,
        models: data.models?.map((m: any) => m.name) || [],
        headers: Object.fromEntries(headersList.entries())
      })

    } catch (fetchError) {
      console.error("❌ Ollama fetch error:", fetchError)
      return NextResponse.json({
        success: false,
        error: `Ollama fetch error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        ollamaUrl,
        headers: Object.fromEntries(headersList.entries())
      })
    }

  } catch (error) {
    console.error("❌ Ollama test error:", error)
    return NextResponse.json({
      success: false,
      error: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
} 