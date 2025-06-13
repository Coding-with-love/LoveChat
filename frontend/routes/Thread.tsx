"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router"
import Chat from "@/frontend/components/Chat"
import { getMessagesByThreadId } from "@/lib/supabase/queries"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useChatNavigator } from "@/frontend/hooks/useChatNavigator"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useTabVisibility } from "@/frontend/hooks/useTabVisibility"
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

  const initializeThread = useCallback(async (isRefresh = false) => {
    if (!user || !id) return
    
    try {
      console.log("🔄 Initializing thread:", id, isRefresh ? "(refresh)" : "(initial)")
      
      // For initial load, show loading state
      // For refresh, ensure loading is false (in case it was stuck)
      if (isRefresh) {
        setLoading(false) // Clear any stuck loading state
      } else {
        setLoading(true)
      }
      setError(null)
      
      // Load API keys first
      await loadKeys()
      
      // Then fetch messages
      const data = await getMessagesByThreadId(id)
      console.log("✅ Thread messages loaded:", data.length, isRefresh ? "(refresh)" : "(initial)")
      setMessages(data)
    } catch (err) {
      console.error("❌ Error initializing thread:", err)
      setError(err instanceof Error ? err.message : "Failed to load thread")
    } finally {
      // Always ensure loading is false when done, regardless of refresh type
      setLoading(false)
    }
  }, [id, user, loadKeys])

  // Add tab visibility management to refresh thread when returning
  useTabVisibility({
    onVisible: () => {
      console.log("🔄 Thread became visible, checking state:", {
        threadId: id,
        messagesCount: messages.length,
        hasUser: !!user,
        isLoading: loading
      })
      
      // Always do a gentle refresh to ensure data is up-to-date
      // This ensures the chat content is properly restored
      if (user && id) {
        console.log("🔄 Refreshing thread messages")
        initializeThread(true) // Pass true to indicate this is a refresh
      } else {
        console.log("🔄 Skipping refresh - no user or thread ID")
      }
    },
    refreshStoresOnVisible: true
  })

  useEffect(() => {
    initializeThread() // Initial load (no refresh flag)
  }, [initializeThread])

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

  return <Chat threadId={id!} initialMessages={convertToUIMessages(messages)} registerRef={registerRef} />
}
