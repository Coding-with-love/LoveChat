import { NextResponse } from "next/server"
import { type NextRequest } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(
  req: NextRequest,
  context: { params: { token: string } }
) {
  try {
    const { token } = context.params

    console.log("🔍 Fetching messages for shared conversation:", token)

    // First get the shared thread to verify access and get thread_id
    const { data: sharedThread, error: sharedError } = await supabaseServer
      .from("shared_threads")
      .select("thread_id, expires_at")
      .eq("share_token", token)
      .single()

    if (sharedError || !sharedThread) {
      console.error("❌ Error fetching shared thread:", sharedError)
      return NextResponse.json({ error: "Shared conversation not found" }, { status: 404 })
    }

    // Check if expired
    if (sharedThread.expires_at && new Date(sharedThread.expires_at) < new Date()) {
      return NextResponse.json({ error: "This shared conversation has expired" }, { status: 410 })
    }

    // Get messages for the thread
    const { data: messages, error: messagesError } = await supabaseServer
      .from("messages")
      .select("*")
      .eq("thread_id", sharedThread.thread_id)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("❌ Error fetching messages:", messagesError)
      return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
    }

    // Add cache control headers to ensure fresh data
    const response = NextResponse.json(messages || [])
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error("💥 Shared messages API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
