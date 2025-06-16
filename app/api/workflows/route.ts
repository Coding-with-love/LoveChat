import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    const { data: workflows, error } = await supabaseServer
      .from("workflows")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 })
    }

    return NextResponse.json(workflows)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, steps, is_public = false, tags = [] } = body

    if (!name || !steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: "Name and steps are required" }, { status: 400 })
    }

    const { data: workflow, error } = await supabaseServer
      .from("workflows")
      .insert({
        user_id: user.id,
        name,
        description,
        steps,
        is_public,
        tags,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
