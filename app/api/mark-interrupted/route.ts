import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  console.log("🔴 [API DEBUG] mark-interrupted API called")
  console.log("🔴 [API DEBUG] Request method:", req.method)
  console.log("🔴 [API DEBUG] Request headers:", Object.fromEntries(req.headers.entries()))

  try {
    const body = await req.text()
    console.log("🔴 [API DEBUG] Raw request body:", body)

    let messageId: string

    try {
      const parsed = JSON.parse(body)
      console.log("🔴 [API DEBUG] Parsed JSON body:", parsed)
      messageId = parsed.messageId
    } catch (parseError) {
      console.log("🔴 [API DEBUG] Failed to parse JSON, treating as plain text:", parseError)
      messageId = body
    }

    console.log("🔴 [API DEBUG] Extracted message ID:", messageId)

    if (!messageId) {
      console.log("🔴 [API DEBUG] No message ID provided in interruption request")
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
    }

    console.log("🔴 [API DEBUG] Querying resumable_streams table...")
    console.log("🔴 [API DEBUG] Looking for message_id:", messageId)
    console.log("🔴 [API DEBUG] Looking for status: streaming")

    // First, let's check what streams exist for this message
    const { data: existingStreams, error: queryError } = await supabaseServer
      .from("resumable_streams")
      .select("*")
      .eq("message_id", messageId)

    console.log("🔴 [API DEBUG] Existing streams for message:", existingStreams)
    if (queryError) {
      console.error("🔴 [API DEBUG] Error querying existing streams:", queryError)
    }

    // Mark any streaming status as paused for this message
    const { error, data } = await supabaseServer
      .from("resumable_streams")
      .update({
        status: "paused",
        last_updated_at: new Date().toISOString(),
      })
      .eq("message_id", messageId)
      .eq("status", "streaming")
      .select()

    console.log("🔴 [API DEBUG] Update operation completed")
    console.log("🔴 [API DEBUG] Updated data:", data)
    console.log("🔴 [API DEBUG] Update error:", error)

    if (error) {
      console.error("🔴 [API DEBUG] Failed to mark stream as interrupted:", error)
      return NextResponse.json({ error: "Failed to mark stream as interrupted" }, { status: 500 })
    }

    console.log("🔴 [API DEBUG] Successfully marked stream as interrupted")
    console.log("🔴 [API DEBUG] Number of rows updated:", data?.length || 0)

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      messageId,
      updatedRows: data,
    })
  } catch (error) {
    console.error("🔴 [API DEBUG] Exception in mark-interrupted API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
