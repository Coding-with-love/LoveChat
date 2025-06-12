import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from("personas")
      .select("*")
      .eq("id", params.id)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .single()

    if (error) {
      console.error("Error fetching persona:", error)
      return NextResponse.json({ error: "Persona not found" }, { status: 404 })
    }

    return NextResponse.json({ persona: data })
  } catch (error) {
    console.error("Error in persona GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, system_prompt, avatar_emoji, color, is_default, is_public } = body

    // If this is being set as default, unset other defaults
    if (is_default) {
      await supabaseServer
        .from("personas")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true)
        .neq("id", params.id)
    }

    const { data, error } = await supabaseServer
      .from("personas")
      .update({
        name,
        description,
        system_prompt,
        avatar_emoji,
        color,
        is_default,
        is_public,
      })
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating persona:", error)
      return NextResponse.json({ error: "Failed to update persona" }, { status: 500 })
    }

    return NextResponse.json({ persona: data })
  } catch (error) {
    console.error("Error in persona PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabaseServer.from("personas").delete().eq("id", params.id).eq("user_id", userId)

    if (error) {
      console.error("Error deleting persona:", error)
      return NextResponse.json({ error: "Failed to delete persona" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in persona DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
