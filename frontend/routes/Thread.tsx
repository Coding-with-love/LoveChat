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
  reasoning?: string
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
      
      // Debug: Check if any messages have reasoning
      const messagesWithReasoning = data.filter(msg => msg.reasoning)
      console.log("🧠 Messages with reasoning from DB:", {
        total: data.length,
        withReasoning: messagesWithReasoning.length,
        reasoningMessages: messagesWithReasoning.map(msg => ({
          id: msg.id,
          role: msg.role,
          reasoningLength: msg.reasoning?.length || 0,
          reasoningPreview: msg.reasoning?.substring(0, 100) || "none"
        }))
      })
      
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
      
      // Clear any stuck loading state first
      if (loading) {
        console.log("🔄 Clearing stuck loading state")
        setLoading(false)
      }
      
      // Only refresh if we don't have messages loaded yet OR if it's been a very long time
      // This prevents overriding local state changes (like rephrased text) on quick tab switches
      // but still allows refreshing if data might be genuinely stale
      const now = Date.now()
      const lastLoad = localStorage.getItem(`thread_${id}_last_load`)
      const lastLoadTime = lastLoad ? parseInt(lastLoad) : 0
      const timeSinceLastLoad = now - lastLoadTime
      const STALE_THRESHOLD = 30 * 60 * 1000 // 30 minutes (increased from 5 minutes)
      
      // Only refresh if no messages OR data is very stale
      if (user && id && (messages.length === 0 || timeSinceLastLoad > STALE_THRESHOLD)) {
        console.log(`🔄 Refreshing thread messages - ${messages.length === 0 ? 'no messages loaded' : `data stale (${Math.round(timeSinceLastLoad/60000)} minutes old)`}`)
        initializeThread(true) // Pass true to indicate this is a refresh
      } else {
        console.log(`🔄 Skipping refresh - messages loaded and fresh (${Math.round(timeSinceLastLoad/60000)} minutes old, threshold: 30 minutes)`)
      }
    },
    refreshStoresOnVisible: false // Don't refresh stores - let API key hydration handle it
  })

  useEffect(() => {
    initializeThread() // Initial load (no refresh flag)
    // Track when we last loaded data
    if (id) {
      localStorage.setItem(`thread_${id}_last_load`, Date.now().toString())
    }
  }, [initializeThread])

  const convertToUIMessages = (messages: DBMessage[]): UIMessage[] => {
    const converted = messages.map((message) => {
      // Extract image attachments for experimental_attachments
      let experimentalAttachments: { name: string; contentType: string; url: string }[] | undefined

      if (message.parts) {
        const fileAttachmentPart = message.parts.find((part: any) => part.type === "file_attachments")
        if (fileAttachmentPart?.attachments) {
          const imageAttachments = fileAttachmentPart.attachments
            .filter((file: any) => file.fileType && file.fileType.startsWith("image/") && file.fileUrl)
            .map((file: any) => ({
              name: file.fileName,
              contentType: file.fileType,
              url: file.fileUrl,
            }))

          if (imageAttachments.length > 0) {
            experimentalAttachments = imageAttachments
            console.log("🖼️ Found image attachments in loaded message:", {
              messageId: message.id,
              imageCount: imageAttachments.length,
                             images: imageAttachments.map((img: any) => ({
                 name: img.name,
                 contentType: img.contentType,
                 hasUrl: !!img.url
               }))
            })
          }
        }
      }

      return {
        id: message.id,
        role: message.role,
        parts: message.parts as UIMessage["parts"],
        content: message.content || "",
        createdAt: new Date(message.created_at),
        experimental_attachments: experimentalAttachments,
        reasoning: message.reasoning, // Include reasoning field from database
      } as UIMessage & { reasoning?: string }
    })
    
    // Debug: Log the content being passed to Chat component
    console.log("🔄 Converting DB messages to UI messages:", {
      messageCount: converted.length,
      messages: converted.map(m => ({
        id: m.id,
        role: m.role,
        contentLength: m.content.length,
        contentPreview: m.content.substring(0, 100),
        hasExperimentalAttachments: !!m.experimental_attachments?.length,
        hasReasoning: !!(m as any).reasoning,
        reasoningLength: (m as any).reasoning?.length || 0
      }))
    })
    
    return converted
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

  return <Chat threadId={id!} initialMessages={convertToUIMessages(messages)} registerRef={registerRef} onRefreshMessages={() => initializeThread(true)} />
}
