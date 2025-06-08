"use client"

import { useEffect, useState } from "react"
import { getThreads } from "@/lib/supabase/queries"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/frontend/components/AuthProvider"

interface Thread {
  id: string
  title: string
  user_id: string
  created_at: string
  updated_at: string
  last_message_at: string
}

export function useThreads() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchThreads = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getThreads()
        setThreads(data)
      } catch (err) {
        console.error("Failed to fetch threads:", err)
        setError(err instanceof Error ? err.message : "Failed to load threads")
      } finally {
        setLoading(false)
      }
    }

    fetchThreads()

    // Set up real-time subscription
    const channel = supabase
      .channel("threads_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "threads",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setThreads((prev) => [payload.new as Thread, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setThreads((prev) =>
              prev.map((thread) => (thread.id === payload.new.id ? (payload.new as Thread) : thread)),
            )
          } else if (payload.eventType === "DELETE") {
            setThreads((prev) => prev.filter((thread) => thread.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return { threads, loading, error, setThreads }
}
