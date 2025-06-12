import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from("prompt_templates")
      .select("*")
      .eq("id", params.id)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .single()

    if (error) {
      console.error("Error fetching template:", error)
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error("Error in template GET:", error)
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
    const { title, description, template, category, tags, persona_id, is_public, variables } = body

    const { data, error } = await supabaseServer
      .from("prompt_templates")
      .update({
        title,
        description,
        template,
        category,
        tags,
        persona_id,
        is_public,
        variables,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating template:", error)
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error("Error in template PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabaseServer.from("prompt_templates").delete().eq("id", params.id).eq("user_id", userId)

    if (error) {
      console.error("Error deleting template:", error)
      return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in template DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
