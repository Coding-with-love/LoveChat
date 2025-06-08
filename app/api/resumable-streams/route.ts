import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { getUserFromHeaders } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    const user = getUserFromHeaders(req)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from("resumable_streams")
      .select(`
        *,
        threads(title)
      `)
      .eq("user_id", user.id)
      .eq("status", "paused")
      .order("started_at", { ascending: false })

    if (error) {
      console.error("Error fetching resumable streams:", error)
      return NextResponse.json({ error: "Failed to fetch resumable streams" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in resumable streams API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
