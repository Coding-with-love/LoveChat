import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
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

    // Get the version to restore
    const { data: version, error: versionError } = await supabaseServer
      .from("artifact_versions")
      .select("*")
      .eq("artifact_id", params.id)
      .eq("id", params.versionId)
      .single()

    if (versionError) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    // Create a new version entry for the current state before restoring
    const { error: backupError } = await supabaseServer
      .from("artifact_versions")
      .insert({
        artifact_id: params.id,
        version: artifact.version + 1,
        content: artifact.content,
        metadata: {
          ...artifact.metadata,
          change_description: `Backup before restoring to version ${version.version}`,
          previous_version: artifact.version,
          content_length: artifact.content.length,
          lines_count: artifact.content.split('\n').length,
          is_backup: true
        },
        created_by: user.id
      })

    if (backupError) {
      console.error("Error creating backup version:", backupError)
      return NextResponse.json({ error: "Failed to create backup" }, { status: 500 })
    }

    // Update the main artifact with the restored content
    const { data: updatedArtifact, error: updateError } = await supabaseServer
      .from("artifacts")
      .update({
        content: version.content,
        version: artifact.version + 1,
        metadata: {
          ...artifact.metadata,
          restored_from_version: version.version,
          restored_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating artifact:", updateError)
      return NextResponse.json({ error: "Failed to restore version" }, { status: 500 })
    }

    return NextResponse.json({ artifact: updatedArtifact })
  } catch (error) {
    console.error("Error in restore version API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 