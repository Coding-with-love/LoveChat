import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

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
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    const executionId = params.id

    // First verify the execution belongs to the user
    const { data: execution, error: fetchError } = await supabaseServer
      .from("workflow_executions")
      .select("*")
      .eq("id", executionId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    // Update the execution status to cancelled
    const { data: updatedExecution, error: updateError } = await supabaseServer
      .from("workflow_executions")
      .update({ 
        status: "cancelled",
        ended_at: new Date().toISOString()
      })
      .eq("id", executionId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ error: "Failed to cancel execution" }, { status: 500 })
    }

    return NextResponse.json(updatedExecution)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 