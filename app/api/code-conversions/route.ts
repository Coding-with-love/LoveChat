import { type NextRequest, NextResponse } from "next/server"
import { getUserFromAuthHeader } from "@/lib/auth-server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Code conversions API called")

    // Check authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      console.error("❌ No authorization header")
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
    }

    const user = await getUserFromAuthHeader(authHeader)
    if (!user) {
      console.error("❌ Invalid user from auth header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ User authenticated:", user.id)

    // Get query parameters
    const threadId = request.nextUrl.searchParams.get("threadId")
    const messageId = request.nextUrl.searchParams.get("messageId")

    if (!threadId || !messageId) {
      return NextResponse.json({ error: "threadId and messageId are required" }, { status: 400 })
    }

    // Query the database for code conversions
    const { data, error } = await supabaseServer
      .from("code_conversions")
      .select("*")
      .eq("thread_id", threadId)
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Failed to fetch code conversions" }, { status: 500 })
    }

    console.log(`✅ Found ${data.length} code conversions for thread ${threadId}, message ${messageId}`)
    
    // Log the first few conversions for debugging
    if (data.length > 0) {
      console.log("📊 Sample conversions:", data.slice(0, 3).map(c => ({
        id: c.id,
        target: c.target_language,
        created: new Date(c.created_at).toISOString()
      })));
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ Error in code conversions API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
