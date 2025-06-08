import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    console.log("🚀 Completion API called")

    // Get authorization header
    const headersList = headers()
    const authHeader = (await headersList).get("authorization")
    console.log("📋 Auth header present:", !!authHeader)

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ Missing or invalid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log("🎫 Token extracted, length:", token.length)

    // Verify token
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      console.log("❌ Auth error:", authError?.message || "No user found")
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)

    const googleApiKey = (await headersList).get("X-Google-API-Key")

    if (!googleApiKey) {
      return NextResponse.json(
        {
          error: "Google API key is required to enable chat title generation.",
        },
        { status: 400 },
      )
    }

    const google = createGoogleGenerativeAI({
      apiKey: googleApiKey,
    })

    const { prompt, isTitle, messageId, threadId } = await req.json()

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 })
    }

    // Verify user owns the thread
    const { data: thread, error: threadError } = await supabaseServer
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 })
    }

    try {
      const { text: title } = await generateText({
        model: google("gemini-2.5-flash-preview-05-20"),
        system: isTitle
          ? `
          - You will generate a short title based on the first message a user begins a conversation with
          - Ensure it is not more than 80 characters long
          - The title should be a summary of the user's message
          - You should NOT answer the user's message, you should only generate a summary/title
          - Do not use quotes or colons
          `
          : `
          - You will generate a brief summary of the user's message for navigation purposes
          - Keep it under 50 characters
          - Focus on the main topic or question
          - Do not use quotes or special characters
          `,
        prompt,
      })

      if (isTitle) {
        // Update thread title
        const { error: updateError } = await supabaseServer
          .from("threads")
          .update({
            title,
            updated_at: new Date().toISOString(),
          })
          .eq("id", threadId)
          .eq("user_id", user.id)

        if (updateError) {
          console.error("Failed to update thread title:", updateError)
          return NextResponse.json({ error: "Failed to update thread title" }, { status: 500 })
        }
      } else if (messageId) {
        // Create message summary
        const { error: summaryError } = await supabaseServer.from("message_summaries").insert({
          thread_id: threadId,
          message_id: messageId,
          user_id: user.id,
          content: title,
        })

        if (summaryError) {
          console.error("Failed to create message summary:", summaryError)
          return NextResponse.json({ error: "Failed to create message summary" }, { status: 500 })
        }
      }

      return NextResponse.json({ title, isTitle, messageId, threadId })
    } catch (error) {
      console.error("Failed to generate title:", error)
      return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
    }
  } catch (error) {
    console.error("Completion API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
