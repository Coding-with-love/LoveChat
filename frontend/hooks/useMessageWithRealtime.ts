"use client"

import { useEffect, useState } from "react"
import { getMessagesByThreadId } from "@/lib/supabase/queries"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useSupabaseSubscription } from "./useSupabaseSubscription"
import type { UIMessage } from "ai"

interface DBMessage {
  id: string
  thread_id: string
  user_id: string
  parts: any
  content: string
  role: "user" | "assistant" | "system" | "data"
  created_at: string
}

export function useMessagesWithRealtime(threadId: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<DBMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial messages
  useEffect(() => {
    if (!user || !threadId) return

    const fetchMessages = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getMessagesByThreadId(threadId)
        setMessages(data)
      } catch (err) {
        console.error("Failed to fetch messages:", err)
        setError(err instanceof Error ? err.message : "Failed to load messages")
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [threadId, user])

  // Set up real-time subscription for messages in this thread
  useSupabaseSubscription({
    table: "messages",
    filter: `thread_id=eq.${threadId}`,
    onInsert: (payload) => {
      setMessages((prev) => [...prev, payload.new as DBMessage])
    },
    onUpdate: (payload) => {
      setMessages((prev) =>
        prev.map((message) => (message.id === payload.new.id ? (payload.new as DBMessage) : message)),
      )
    },
    onDelete: (payload) => {
      setMessages((prev) => prev.filter((message) => message.id !== payload.old.id))
    },
  })

  const convertToUIMessages = (messages: DBMessage[]): UIMessage[] => {
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      parts: message.parts as UIMessage["parts"],
      content: message.content || "",
      createdAt: new Date(message.created_at),
    }))
  }

  return {
    messages,
    uiMessages: convertToUIMessages(messages),
    loading,
    error,
    setMessages,
  }
}
