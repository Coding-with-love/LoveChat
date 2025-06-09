import { supabase } from "./client"
import { supabaseServer } from "./server"
import type { AIModel } from "@/lib/models"

export interface ResumableStream {
  id: string
  thread_id: string
  message_id: string
  user_id: string
  status: "streaming" | "paused" | "completed" | "failed"
  partial_content: string
  continuation_prompt: string | null
  model: string
  model_config: any
  created_at: string // Changed from started_at
  last_updated_at: string // This should be last_chunk_at
  completed_at: string | null
  total_tokens: number
  estimated_completion: number
}

// Client-side functions
export const createResumableStream = async (
  threadId: string,
  messageId: string,
  model: AIModel,
  modelConfig: any,
  initialPrompt?: string,
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase
    .from("resumable_streams")
    .insert({
      thread_id: threadId,
      message_id: messageId,
      user_id: user.id,
      status: "streaming",
      model,
      model_config: modelConfig,
      continuation_prompt: initialPrompt,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateResumableStream = async (
  id: string,
  updates: Partial<
    Pick<
      ResumableStream,
      "status" | "partial_content" | "continuation_prompt" | "total_tokens" | "estimated_completion" | "completed_at"
    >
  >,
) => {
  const { data, error } = await supabase.from("resumable_streams").update(updates).eq("id", id).select().single()

  if (error) throw error
  return data
}

export const getResumableStreamByMessageId = async (messageId: string) => {
  const { data, error } = await supabase.from("resumable_streams").select("*").eq("message_id", messageId).single()

  if (error && error.code !== "PGRST116") throw error // PGRST116 is "not found"
  return data
}

export const getUserResumableStreams = async (status?: ResumableStream["status"]) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  let query = supabase
    .from("resumable_streams")
    .select(`
      *,
      threads(title),
      messages(content)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export const deleteResumableStream = async (id: string) => {
  const { error } = await supabase.from("resumable_streams").delete().eq("id", id)

  if (error) throw error
}

// Server-side functions (for API routes)
export const createResumableStreamServer = async (
  threadId: string,
  messageId: string,
  userId: string,
  model: AIModel,
  modelConfig: any,
  initialPrompt?: string,
) => {
  const { data, error } = await supabaseServer
    .from("resumable_streams")
    .insert({
      thread_id: threadId,
      message_id: messageId,
      user_id: userId,
      status: "streaming",
      model,
      model_config: modelConfig,
      continuation_prompt: initialPrompt,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateResumableStreamServer = async (
  id: string,
  updates: Partial<
    Pick<
      ResumableStream,
      "status" | "partial_content" | "continuation_prompt" | "total_tokens" | "estimated_completion" | "completed_at"
    >
  >,
) => {
  const { data, error } = await supabaseServer.from("resumable_streams").update(updates).eq("id", id).select().single()

  if (error) throw error
  return data
}

export const getResumableStreamByIdServer = async (id: string) => {
  const { data, error } = await supabaseServer.from("resumable_streams").select("*").eq("id", id).single()

  if (error) throw error
  return data
}

export const markStreamAsInterrupted = async (messageId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Mark any streaming status as paused for this message
  const { error } = await supabase
    .from("resumable_streams")
    .update({
      status: "paused",
      last_updated_at: new Date().toISOString(),
    })
    .eq("message_id", messageId)
    .eq("status", "streaming")

  if (error) {
    console.error("Failed to mark stream as interrupted:", error)
  }
}

// Utility function to estimate completion based on content length
export const estimateCompletion = (partialContent: string, expectedLength?: number): number => {
  if (!expectedLength) {
    // Use heuristics based on typical response lengths
    const avgResponseLength = 500 // characters
    return Math.min(partialContent.length / avgResponseLength, 0.95)
  }

  return Math.min(partialContent.length / expectedLength, 1.0)
}
