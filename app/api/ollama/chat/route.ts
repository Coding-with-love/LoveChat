import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { baseUrl, model, messages, stream = true } = await req.json()

    if (!baseUrl || !model || !messages) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log(`Sending chat request to Ollama at ${baseUrl} for model ${model}`)

    // Format messages for Ollama API
    const ollamaMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream,
        options: {
          temperature: 0.7,
        },
      }),
    })

    if (!response.ok) {
      console.error(`Ollama API error: ${response.statusText}`)
      return NextResponse.json({ error: `Ollama API error: ${response.statusText}` }, { status: response.status })
    }

    // If streaming is enabled, return a streaming response
    if (stream) {
      // Create a readable stream that transforms Ollama's format
      const readable = new ReadableStream({
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

              const text = new TextDecoder().decode(value)
              const lines = text.split('\n').filter(Boolean)

              for (const line of lines) {
                try {
                  const data = JSON.parse(line)

                  if (data.done) {
                    controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`))
                  } else {
                    const transformedChunk = {
                      id: crypto.randomUUID(),
                      object: "chat.completion.chunk",
                      created: Date.now(),
                      model,
                      choices: [
                        {
                          index: 0,
                          delta: {
                            content: data.message?.content || "",
                          },
                          finish_reason: data.done ? "stop" : null,
                        },
                      ],
                    }
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify(transformedChunk)}\n\n`)
                    )
                  }
                } catch (parseError) {
                  console.error("Error parsing Ollama response line:", parseError)
                }
              }
            }
          } catch (error) {
            console.error("Error reading Ollama stream:", error)
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    } else {
      // For non-streaming responses
      const data = await response.json()
      return NextResponse.json({
        id: crypto.randomUUID(),
        object: "chat.completion",
        created: Date.now(),
        model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: data.message?.content || "",
            },
            finish_reason: "stop",
          },
        ],
      })
    }
  } catch (error) {
    console.error("Error in Ollama chat API:", error)
    return NextResponse.json({ error: "Failed to process Ollama chat request" }, { status: 500 })
  }
}
