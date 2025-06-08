"use client"

import { useEffect, useState } from "react"
import { getThreads } from "@/lib/supabase/queries"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useSupabaseSubscription } from "./useSupabaseSubscription"
import { toast } from "sonner"

interface Thread {
  id: string
  title: string
  user_id: string
  created_at: string
  updated_at: string
  last_message_at: string
}

export function useThreadsWithRealtime() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial threads
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
        toast.error("Failed to load threads")
      } finally {
        setLoading(false)
      }
    }

    fetchThreads()
  }, [user])

  // Set up real-time subscription
  useSupabaseSubscription({
    table: "threads",
    onInsert: (payload) => {
      setThreads((prev) => [payload.new as Thread, ...prev])
    },
    onUpdate: (payload) => {
      setThreads((prev) => prev.map((thread) => (thread.id === payload.new.id ? (payload.new as Thread) : thread)))
    },
    onDelete: (payload) => {
      setThreads((prev) => prev.filter((thread) => thread.id !== payload.old.id))
    },
  })

  return {
    threads,
    loading,
    error,
    setThreads,
  }
}
