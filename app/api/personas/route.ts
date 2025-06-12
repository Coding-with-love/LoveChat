import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includePublic = searchParams.get("includePublic") === "true"

    let query = supabaseServer.from("personas").select("*")

    if (includePublic) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true`)
    } else {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching personas:", error)
      // If table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json({ personas: [] })
      }
      return NextResponse.json({ error: "Failed to fetch personas" }, { status: 500 })
    }

    return NextResponse.json({ personas: data || [] })
  } catch (error) {
    console.error("Error in personas GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, system_prompt, avatar_emoji, color, is_default, is_public } = body

    if (!name || !system_prompt) {
      return NextResponse.json({ error: "Name and system prompt are required" }, { status: 400 })
    }

    // If this is set as default, unset other defaults for this user
    if (is_default) {
      await supabaseServer
        .from("personas")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true)
    }

    const { data, error } = await supabaseServer
      .from("personas")
      .insert({
        user_id: userId,
        name,
        description,
        system_prompt,
        avatar_emoji: avatar_emoji || "🤖",
        color: color || "#6366f1",
        is_default: is_default || false,
        is_public: is_public || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating persona:", error)
      return NextResponse.json({ error: "Failed to create persona" }, { status: 500 })
    }

    return NextResponse.json({ persona: data })
  } catch (error) {
    console.error("Error in personas POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
