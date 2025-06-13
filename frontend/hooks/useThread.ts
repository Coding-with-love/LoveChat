"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useUser } from "./useUser"

interface Thread {
  id: string
  created_at: string
  title: string
  user_id: string
}

export const useThread = (threadId: string | null) => {
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()
  const id = threadId

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    const fetchThread = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from("threads").select("*").eq("id", id).single()

        if (error) {
          setError(error)
        } else {
          setThread(data)
        }
      } catch (err: any) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchThread()
  }, [id])

  const updateTitle = async (newTitle: string, threadId?: string): Promise<boolean> => {
    if (!newTitle.trim()) return false

    try {
      const idToUpdate = threadId || id
      if (!idToUpdate) return false

      await supabase
        .from("threads")
        .update({
          title: newTitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idToUpdate)

      // Only update local state if we're updating the current thread
      if (!threadId || threadId === id) {
        setThread((prev) => (prev ? { ...prev, title: newTitle } : null))
      }

      return true
    } catch (error) {
      console.error("Error updating thread title:", error)
      return false
    }
  }

  return { thread, loading, error, updateTitle }
}
