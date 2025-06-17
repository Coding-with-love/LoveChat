import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/workflows/executions - Starting request')
    
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      console.log('❌ No valid auth header found')
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log('🎫 Token extracted, length:', token.length)
    
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message)
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)
    console.log('📊 Querying workflow_executions for user:', user.id)

    const { data: executions, error } = await supabaseServer
      .from("workflow_executions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Database error:", error)
      return NextResponse.json({ error: "Failed to fetch executions", details: error.message }, { status: 500 })
    }

    console.log('✅ Executions fetched successfully:', executions?.length || 0, 'records')
    console.log('📋 Execution data preview:', executions?.slice(0, 2))

    return NextResponse.json(executions || [])
  } catch (error) {
    console.error("❌ API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 