import { supabase } from "./supabase/client"
import { supabaseServer } from "./supabase/server"

export interface ResumableStream {
  id: string
  thread_id: string
  user_id: string
  status: "active" | "paused" | "completed" | "failed"
  partial_content: string
  last_chunk_at: string
  created_at: string
  completed_at: string | null
  error_message: string | null
}

// Client-side functions only
export async function resumeStream(streamId: string): Promise<ReadableStream | null> {
  try {
    const response = await fetch(`/api/resume-stream?streamId=${streamId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    })

    if (!response.ok) {
      console.log(`Failed to resume stream: ${response.statusText}`)
      return null
    }

    return response.body
  } catch (error) {
    console.error("Error resuming stream:", error)
    return null
  }
}

export async function getActiveStreamsForThread(threadId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("resumable_streams")
      .select("id")
      .eq("thread_id", threadId)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false })

    if (error) throw error
    return data?.map((s) => s.id) || []
  } catch (error) {
    console.error("Error getting active streams:", error)
    return []
  }
}
