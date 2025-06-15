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
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
  const path = pathSegments.join('/')
  const url = `${ollamaUrl}/api/${path}`
  
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
        // Forward relevant headers
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: body || undefined,
    })

    // Handle streaming responses for chat completions
    if (response.headers.get('content-type')?.includes('text/plain')) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Handle JSON responses
    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })

  } catch (error) {
    console.error('Ollama proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Ollama server' },
      { status: 500 }
    )
  }
} 