"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

interface Thread {
  id: string
  title: string
  user_id: string
  created_at: string
  updated_at: string
}

export function useThread(threadId: string | undefined) {
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!threadId) {
      setThread(null)
      return
    }

    const fetchThread = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase.from("threads").select("*").eq("id", threadId).single()

        if (error) throw error
        setThread(data)
      } catch (err) {
        console.error("Error fetching thread:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch thread")
      } finally {
        setLoading(false)
      }
    }

    fetchThread()
  }, [threadId])

  const updateTitle = async (newTitle: string) => {
    if (!threadId || !newTitle.trim()) return false

    try {
      const { error } = await supabase
        .from("threads")
        .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
        .eq("id", threadId)

      if (error) throw error

      setThread((prev) => (prev ? { ...prev, title: newTitle.trim() } : null))
      return true
    } catch (err) {
      console.error("Error updating thread title:", err)
      setError(err instanceof Error ? err.message : "Failed to update title")
      return false
    }
  }

  return {
    thread,
    loading,
    error,
    updateTitle,
  }
}
