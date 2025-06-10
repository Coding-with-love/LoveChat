import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { supabaseServer } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    console.log("🚀 Completion API called")

    // Get authorization header
    const headersList = await headers()
    const authHeader = headersList.get("authorization")
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

    // Check all headers for debugging
    console.log("📋 Available headers:", Object.fromEntries(headersList.entries()))

    // Look for Google API key in different possible header names
    let googleApiKey =
      headersList.get("X-Google-API-Key") ||
      headersList.get("x-google-api-key") ||
      headersList.get("google-api-key") ||
      headersList.get("x-gemini-api-key") ||
      headersList.get("x-api-key-google")

    console.log("🔑 Google API key found:", !!googleApiKey, "Length:", googleApiKey?.length || 0)

    if (!googleApiKey) {
      // Try to get the API key from the database
      try {
        console.log("🔍 Looking for API key in database for user:", user.id)
        const { data: apiKeys } = await supabaseServer
          .from("api_keys")
          .select("provider, api_key")
          .eq("user_id", user.id)
          .eq("provider", "google")
          .single()

        if (apiKeys?.api_key) {
          googleApiKey = apiKeys.api_key
          console.log("✅ Found Google API key in database")
        } else {
          console.log("❌ No Google API key found in database")
        }
      } catch (dbError) {
        console.error("❌ Error fetching API key from database:", dbError)
      }
    }

    if (!googleApiKey) {
      return NextResponse.json(
        {
          error: "Google API key is required to enable chat title generation.",
        },
        { status: 400 },
      )
    }

    // Get the request body
    const { prompt, isTitle, messageId, threadId } = await req.json()
    console.log("📝 Request body:", {
      promptLength: prompt?.length || 0,
      isTitle,
      messageId,
      threadId,
    })

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 })
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Verify user owns the thread
    const { data: thread, error: threadError } = await supabaseServer
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .single()

    if (threadError || !thread) {
      console.error("❌ Thread verification failed:", threadError)
      return NextResponse.json({ error: "Thread not found or access denied" }, { status: 404 })
    }

    console.log("✅ Thread verified for user")

    // Initialize Google AI
    try {
      const genAI = new GoogleGenerativeAI(googleApiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      console.log("🤖 Generating content with Gemini...")
      const result = await model.generateContent(
        isTitle
          ? `Generate a short title based on the following message. 
          Ensure it is not more than 80 characters long.
          The title should be a summary of the message.
          Do not use quotes or colons.
          Message: ${prompt}`
          : `Generate a brief summary of the following message for navigation purposes.
          Keep it under 50 characters.
          Focus on the main topic or question.
          Do not use quotes or special characters.
          Message: ${prompt}`,
      )

      const response = await result.response
      const title = response.text().trim()

      console.log("✅ Content generated successfully:", title)

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
          console.error("❌ Failed to update thread title:", updateError)
          return NextResponse.json({ error: "Failed to update thread title" }, { status: 500 })
        }

        console.log("✅ Thread title updated successfully")
      } else if (messageId) {
        // Create message summary - add better error handling
        try {
          const { error: summaryError } = await supabaseServer.from("message_summaries").insert({
            thread_id: threadId,
            message_id: messageId,
            user_id: user.id,
            content: title,
          })

          if (summaryError) {
            console.error("❌ Failed to create message summary:", summaryError)
            // Don't return error for summary creation failure - it's not critical
            console.log("⚠️ Continuing despite summary creation failure")
          } else {
            console.log("✅ Message summary created successfully")
          }
        } catch (summaryError) {
          console.error("❌ Exception creating message summary:", summaryError)
          // Don't return error - summary creation is not critical
        }
      }

      return NextResponse.json({ title, isTitle, messageId, threadId })
    } catch (genError) {
      console.error("❌ Google AI generation error:", genError)

      if (genError instanceof Error) {
        if (genError.message.includes("API_KEY_INVALID")) {
          return NextResponse.json({ error: "Invalid Google API key" }, { status: 400 })
        } else if (genError.message.includes("QUOTA_EXCEEDED")) {
          return NextResponse.json({ error: "Google API quota exceeded" }, { status: 429 })
        } else {
          return NextResponse.json({ error: `Google AI error: ${genError.message}` }, { status: 500 })
        }
      }

      return NextResponse.json({ error: "Failed to generate content with Google AI" }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ Completion API error:", error)

    if (error instanceof Error) {
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
