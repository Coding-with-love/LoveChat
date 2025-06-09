import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { supabaseServer } from "@/lib/supabase/server"
import { CustomResumableStream } from "@/lib/resumable-streams-server"

export async function GET(req: NextRequest) {
  console.log("🔄 Resume stream API called")

  try {
    const { searchParams } = new URL(req.url)
    const streamId = searchParams.get("streamId")

    if (!streamId) {
      return NextResponse.json({ error: "Stream ID is required" }, { status: 400 })
    }

    // Get authorization header
    const headersList = headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify token
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    // Verify user owns this stream
    const { data: streamData, error: streamError } = await supabaseServer
      .from("resumable_streams")
      .select("user_id")
      .eq("id", streamId)
      .single()

    if (streamError || !streamData) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 })
    }

    if (streamData.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Attempt to resume the stream
    const resumedStream = await CustomResumableStream.resume(streamId)

    if (!resumedStream) {
      return NextResponse.json({ error: "Unable to resume stream" }, { status: 404 })
    }

    return new Response(resumedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Error in resume stream API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
