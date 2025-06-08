"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

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
  started_at: string
  last_updated_at: string
  completed_at: string | null
  total_tokens: number
  estimated_completion: number
  threads?: { title: string }
}

export function useResumableStreams() {
  const [streams, setStreams] = useState<ResumableStream[]>([])
  const [loading, setLoading] = useState(false)
  const [resumingId, setResumingId] = useState<string | null>(null)

  const loadStreams = useCallback(async () => {
    try {
      setLoading(true)

      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      console.log("🔄 Loading resumable streams for user:", user.id)

      // Fetch paused streams for the current user
      const { data, error } = await supabase
        .from("resumable_streams")
        .select(`
          *,
          threads(title)
        `)
        .eq("user_id", user.id)
        .eq("status", "paused")
        .order("started_at", { ascending: false })

      if (error) {
        console.error("Error loading resumable streams:", error)
        throw error
      }

      console.log("✅ Loaded resumable streams:", data?.length || 0)
      setStreams(data || [])
    } catch (error) {
      console.error("Failed to load resumable streams:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const resumeStream = useCallback(
    async (streamId: string) => {
      if (resumingId) return

      try {
        setResumingId(streamId)
        console.log("▶️ Resuming stream:", streamId)

        // Call the resume API endpoint
        const response = await fetch("/api/resume-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ streamId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to resume stream")
        }

        // Update local state - remove the resumed stream from paused list
        setStreams((prev) => prev.filter((s) => s.id !== streamId))
        toast.success("Stream resumed successfully")
        console.log("✅ Stream resumed successfully:", streamId)
      } catch (error) {
        console.error("Failed to resume stream:", error)
        toast.error(error instanceof Error ? error.message : "Failed to resume stream")
      } finally {
        setResumingId(null)
      }
    },
    [resumingId],
  )

  useEffect(() => {
    loadStreams()

    // Set up real-time subscription for resumable streams
    const channel = supabase
      .channel("resumable_streams_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "resumable_streams",
        },
        (payload) => {
          console.log("📡 Resumable stream change:", payload)
          // Reload streams when there are changes
          loadStreams()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadStreams])

  const pausedStreams = streams.filter((s) => s.status === "paused")
  const hasResumableStreams = pausedStreams.length > 0

  return {
    streams,
    pausedStreams,
    hasResumableStreams,
    loading,
    resumingId,
    loadStreams,
    resumeStream,
  }
}
