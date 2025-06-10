import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { threadId, format } = await request.json()

    if (!threadId || !format) {
      return NextResponse.json({ error: "Thread ID and format are required" }, { status: 400 })
    }

    // Get thread and messages
    const { data: thread, error: threadError } = await supabaseServer
      .from("threads")
      .select("*")
      .eq("id", threadId)
      .single()

    if (threadError) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    const { data: messages, error: messagesError } = await supabaseServer
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    let content = ""
    let contentType = "text/plain"
    let filename = `${thread.title || "conversation"}`

    switch (format) {
      case "markdown":
        content = generateMarkdown(thread, messages)
        contentType = "text/markdown"
        filename += ".md"
        break
      case "txt":
        content = generatePlainText(thread, messages)
        contentType = "text/plain"
        filename += ".txt"
        break
      case "pdf":
        // For PDF, you'd need a PDF generation library like puppeteer or jsPDF
        return NextResponse.json({ error: "PDF export not implemented yet" }, { status: 501 })
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 })
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateMarkdown(thread: any, messages: any[]) {
  let content = `# ${thread.title}\n\n`
  content += `**Created:** ${new Date(thread.created_at).toLocaleString()}\n\n`
  content += `---\n\n`

  messages.forEach((message) => {
    const timestamp = new Date(message.created_at).toLocaleString()
    const role = message.role === "user" ? "User" : "Assistant"

    content += `## ${role} - ${timestamp}\n\n`
    content += `${message.content}\n\n`

    if (message.reasoning) {
      content += `*Reasoning:* ${message.reasoning}\n\n`
    }

    content += `---\n\n`
  })

  return content
}

function generatePlainText(thread: any, messages: any[]) {
  let content = `${thread.title}\n`
  content += `Created: ${new Date(thread.created_at).toLocaleString()}\n\n`
  content += `${"=".repeat(50)}\n\n`

  messages.forEach((message) => {
    const timestamp = new Date(message.created_at).toLocaleString()
    const role = message.role === "user" ? "User" : "Assistant"

    content += `${role} - ${timestamp}\n`
    content += `${"-".repeat(30)}\n`
    content += `${message.content}\n\n`

    if (message.reasoning) {
      content += `Reasoning: ${message.reasoning}\n\n`
    }
  })

  return content
}
