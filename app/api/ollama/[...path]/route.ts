import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleOllamaRequest(request, params.path)
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleOllamaRequest(request, params.path)
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleOllamaRequest(request, params.path)
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleOllamaRequest(request, params.path)
}

async function handleOllamaRequest(request: NextRequest, pathSegments: string[]) {
  // Get the Ollama base URL from headers (sent by frontend) or fallback to environment/default
  const ollamaBaseUrl = request.headers.get('x-ollama-base-url') || 
                        request.headers.get('X-Ollama-Base-URL') || 
                        process.env.OLLAMA_URL || 
                        'http://localhost:11434'
  
  const path = pathSegments.join('/')
  const url = `${ollamaBaseUrl}/api/${path}`
  
  console.log(`🦙 Ollama proxy: ${request.method} ${url}`)
  
  try {
    // Get the request body if it exists
    let body = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text()
    }

    // Forward the request to Ollama
    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward relevant headers but exclude our custom header
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: body || undefined,
    })

    if (!response.ok) {
      console.error(`🦙 Ollama proxy error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: `Ollama server error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    // Handle streaming responses for chat completions
    if (response.headers.get('content-type')?.includes('text/plain')) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          // Add CORS headers
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ollama-Base-URL',
        },
      })
    }

    // Handle JSON responses
    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        // Add CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ollama-Base-URL',
      },
    })

  } catch (error) {
    console.error('🦙 Ollama proxy error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to Ollama server',
        details: error instanceof Error ? error.message : 'Unknown error',
        ollamaUrl: ollamaBaseUrl
      },
      { 
        status: 500,
        headers: {
          // Add CORS headers even for errors
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ollama-Base-URL',
        }
      }
    )
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Ollama-Base-URL',
    },
  })
} 