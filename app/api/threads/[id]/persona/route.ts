import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Database } from "@/lib/supabase/types"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id
    const { personaId } = await request.json()

    // Get the user from the session
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = session.user.id

    // Check if thread exists and belongs to user
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single()
      
    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }
    
    // Check if persona exists and belongs to user or is public
    if (personaId) {
      const { data: persona, error: personaError } = await supabase
        .from("personas")
        .select("id")
        .eq("id", personaId)
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .single()
        
      if (personaError || !persona) {
        return NextResponse.json({ error: "Persona not found" }, { status: 404 })
      }
    }
    
    // Delete any existing thread persona
    await supabase
      .from("thread_personas")
      .delete()
      .eq("thread_id", threadId)
    
    // If personaId is provided, insert new thread persona
    if (personaId) {
      const { error: insertError } = await supabase
        .from("thread_personas")
        .insert({
          thread_id: threadId,
          persona_id: personaId,
          user_id: userId
        })
        
      if (insertError) {
        console.error("Error inserting thread persona:", insertError)
        return NextResponse.json({ error: "Failed to set thread persona" }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in thread persona API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id

    // Get the user from the session
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = session.user.id

    // Check if thread exists and belongs to user
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single()
      
    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }
    
    // Delete thread persona
    const { error: deleteError } = await supabase
      .from("thread_personas")
      .delete()
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      
    if (deleteError) {
      console.error("Error deleting thread persona:", deleteError)
      return NextResponse.json({ error: "Failed to clear thread persona" }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in thread persona API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
