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

    // First verify the artifact belongs to the user
    const { data: artifact, error: artifactError } = await supabaseServer
      .from("artifacts")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (artifactError) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    // Get all versions for this artifact
    const { data: versions, error } = await supabaseServer
      .from("artifact_versions")
      .select("*")
      .eq("artifact_id", params.id)
      .order("version", { ascending: false })

    if (error) {
      console.error("Error fetching artifact versions:", error)
      return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 })
    }

    return NextResponse.json({ versions })
  } catch (error) {
    console.error("Error in artifact versions GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
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

    // First verify the artifact belongs to the user
    const { data: artifact, error: artifactError } = await supabaseServer
      .from("artifacts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (artifactError) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    const body = await request.json()
    const { content, metadata = {}, change_description } = body

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Create a new version entry
    const { data: version, error: versionError } = await supabaseServer
      .from("artifact_versions")
      .insert({
        artifact_id: params.id,
        version: artifact.version + 1,
        content,
        metadata: {
          ...metadata,
          change_description,
          previous_version: artifact.version,
          content_length: content.length,
          lines_count: content.split('\n').length
        },
        created_by: user.id
      })
      .select()
      .single()

    if (versionError) {
      console.error("Error creating artifact version:", versionError)
      return NextResponse.json({ error: "Failed to create version" }, { status: 500 })
    }

    // Update the main artifact with new content and version
    const { data: updatedArtifact, error: updateError } = await supabaseServer
      .from("artifacts")
      .update({
        content,
        version: artifact.version + 1,
        metadata: { ...artifact.metadata, ...metadata },
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating artifact:", updateError)
      return NextResponse.json({ error: "Failed to update artifact" }, { status: 500 })
    }

    return NextResponse.json({ version, artifact: updatedArtifact })
  } catch (error) {
    console.error("Error in artifact versions POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
