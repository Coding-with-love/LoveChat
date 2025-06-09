import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    // Get authorization header
    const headersList = headers()
    const authHeader = (await headersList).get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No authorization header found")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify token
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      console.error("Invalid token:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // Get thread ID from query params
    const url = new URL(req.url)
    const threadId = url.searchParams.get("threadId")

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 })
    }

    console.log(`Fetching resumable streams for thread ${threadId} and user ${user.id}`)

    // Query for active streams for this thread and user
    const { data, error } = await supabaseServer
      .from("resumable_streams")
      .select("id")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching resumable streams:", error)
      return NextResponse.json({ error: "Failed to fetch resumable streams" }, { status: 500 })
    }

    // Extract stream IDs
    const streams = data.map((stream) => stream.id)
    console.log(`Found ${streams.length} active streams`)

    return NextResponse.json({ streams })
  } catch (error) {
    console.error("Error in resumable streams API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
