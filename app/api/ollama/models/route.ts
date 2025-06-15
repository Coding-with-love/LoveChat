import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { baseUrl } = await req.json()

    if (!baseUrl) {
      return NextResponse.json({ error: "Ollama base URL is required" }, { status: 400 })
    }

    console.log(`Fetching models from Ollama at ${baseUrl}`)

    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    console.log(response)

    if (!response.ok) {
      console.error(`Failed to fetch models: ${response.statusText}`)
      return NextResponse.json(
        { error: `Failed to connect to Ollama: ${response.statusText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log(data)
    return NextResponse.json({ models: data.models || [] })
  } catch (error) {
    console.error("Error fetching Ollama models:", error)
    return NextResponse.json({ error: "Failed to connect to Ollama server" }, { status: 500 })
  }
}
