import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { baseUrl } = await req.json()

    if (!baseUrl) {
      return NextResponse.json(
        { error: "Ollama base URL is required" }, 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }

    console.log(`🦙 Fetching models from Ollama at ${baseUrl}`)

    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`🦙 Failed to fetch models: ${response.status} ${response.statusText}`)
        return NextResponse.json(
          { 
            error: `Failed to connect to Ollama: ${response.status} ${response.statusText}`,
            details: `Unable to reach Ollama at ${baseUrl}. Make sure Ollama is running and accessible.`,
            baseUrl 
          },
          { 
            status: response.status >= 400 && response.status < 500 ? response.status : 502,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }

      const data = await response.json()
      console.log(`🦙 Successfully fetched ${data.models?.length || 0} models from Ollama`)
      
      return NextResponse.json(
        { models: data.models || [] },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error("🦙 Request to Ollama timed out")
        return NextResponse.json(
          { 
            error: "Connection to Ollama timed out",
            details: `Unable to reach Ollama at ${baseUrl} within 10 seconds. This usually means Ollama is not accessible from the production server.`,
            baseUrl,
            suggestion: "If you're trying to connect to localhost from production, consider using ngrok to expose your local Ollama instance."
          },
          { 
            status: 504,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }
      
      throw fetchError
    }

  } catch (error) {
    console.error("🦙 Error fetching Ollama models:", error)
    
    // Provide helpful error messages based on the error type
    let errorMessage = "Failed to connect to Ollama server"
    let details = "An unexpected error occurred while trying to connect to Ollama."
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = "Network error connecting to Ollama"
      details = "This usually means the Ollama server is not reachable from the production environment. If you're trying to connect to localhost, consider using a service like ngrok to expose your local Ollama instance."
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details,
        technical: error instanceof Error ? error.message : "Unknown error"
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
