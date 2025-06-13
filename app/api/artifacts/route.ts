import { NextRequest, NextResponse } from "next/server"
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
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get("threadId")
    const search = searchParams.get("search")
    const contentType = searchParams.get("contentType")
    const tags = searchParams.get("tags")
    const pinned = searchParams.get("pinned")
    const archived = searchParams.get("archived")

    let query = supabaseServer
      .from("artifacts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (threadId) {
      query = query.eq("thread_id", threadId)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`)
    }

    if (contentType) {
      query = query.eq("content_type", contentType)
    }

    if (tags) {
      const tagArray = tags.split(",")
      query = query.overlaps("tags", tagArray)
    }

    if (pinned === "true") {
      query = query.eq("is_pinned", true)
    }

    if (archived === "true") {
      query = query.eq("is_archived", true)
    } else {
      query = query.eq("is_archived", false)
    }

    const { data: artifacts, error } = await query

    if (error) {
      console.error("Error fetching artifacts:", error)
      return NextResponse.json({ error: "Failed to fetch artifacts" }, { status: 500 })
    }

    return NextResponse.json({ artifacts })
  } catch (error) {
    console.error("Artifacts API error:", error)
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
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      content,
      content_type,
      language,
      file_extension,
      tags,
      metadata,
      thread_id,
      message_id
    } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const { data: artifact, error } = await supabaseServer
      .from("artifacts")
      .insert({
        user_id: user.id,
        title,
        description,
        content,
        content_type: content_type || "text",
        language,
        file_extension,
        tags: tags || [],
        metadata: metadata || {},
        thread_id,
        message_id
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating artifact:", error)
      return NextResponse.json({ error: "Failed to create artifact" }, { status: 500 })
    }

    return NextResponse.json({ artifact })
  } catch (error) {
    console.error("Create artifact API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
