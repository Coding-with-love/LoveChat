import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const { data: artifact, error } = await supabaseServer
      .from("artifacts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching artifact:", error)
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    return NextResponse.json({ artifact })
  } catch (error) {
    console.error("Get artifact API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const body = await request.json()
    const updates = { ...body }
    delete updates.id
    delete updates.user_id
    delete updates.created_at

    const { data: artifact, error } = await supabaseServer
      .from("artifacts")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating artifact:", error)
      return NextResponse.json({ error: "Failed to update artifact" }, { status: 500 })
    }

    return NextResponse.json({ artifact })
  } catch (error) {
    console.error("Update artifact API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const { error } = await supabaseServer
      .from("artifacts")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting artifact:", error)
      return NextResponse.json({ error: "Failed to delete artifact" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete artifact API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
