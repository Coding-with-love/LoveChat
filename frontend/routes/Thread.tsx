"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router"
import Chat from "@/frontend/components/Chat"
import { getMessagesByThreadId } from "@/lib/supabase/queries"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useChatNavigator } from "@/frontend/hooks/useChatNavigator"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
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

export default function Thread() {
  const { id } = useParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState<DBMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadKeys = useAPIKeyStore((state) => state.loadKeys)

  const { registerRef } = useChatNavigator()

  useEffect(() => {
    if (!user || !id) return

    const initializeThread = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load API keys first
        await loadKeys()
        
        // Then fetch messages
        const data = await getMessagesByThreadId(id)
        setMessages(data)
      } catch (err) {
        console.error("Error initializing thread:", err)
        setError(err instanceof Error ? err.message : "Failed to load thread")
      } finally {
        setLoading(false)
      }
    }

    initializeThread()
  }, [id, user, loadKeys])

  const convertToUIMessages = (messages: DBMessage[]): UIMessage[] => {
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      parts: message.parts as UIMessage["parts"],
      content: message.content || "",
      createdAt: new Date(message.created_at),
    }))
  }

  if (!id) {
    return <div className="p-4">Thread ID is required</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading thread</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return <Chat key={id} threadId={id} initialMessages={convertToUIMessages(messages)} registerRef={registerRef} />
}
