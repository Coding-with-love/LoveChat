"use client"

import { useEffect, useState } from "react"
import { getMessageSummaries, getFirstUserMessage } from "@/lib/supabase/queries"
import { supabase } from "@/lib/supabase/client"
import { memo } from "react"
import { X } from "lucide-react"
import { Button } from "./ui/button"
import { useAuth } from "@/frontend/components/AuthProvider"

interface MessageSummary {
  id: string
  thread_id: string
  message_id: string
  user_id: string
  content: string
  created_at: string
}

interface FirstMessage {
  id: string
  content: string
  created_at: string
}

interface NavigatorItem {
  id: string
  message_id: string
  content: string
  created_at: string
  isFirstMessage?: boolean
}

interface MessageNavigatorProps {
  threadId: string
  scrollToMessage: (id: string) => void
  isVisible: boolean
  onClose: () => void
}

function PureChatNavigator({ threadId, scrollToMessage, isVisible, onClose }: MessageNavigatorProps) {
  const { user } = useAuth()
  const [navigatorItems, setNavigatorItems] = useState<NavigatorItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!user || !threadId) return

    try {
      setLoading(true)
      
      // Fetch both summaries and first message in parallel
      const [summaries, firstMessage] = await Promise.all([
        getMessageSummaries(threadId),
        getFirstUserMessage(threadId)
      ])

      console.log("📋 Fetched summaries:", summaries.length)
      console.log("📋 First message:", firstMessage ? "Found" : "Not found")

      // Convert summaries to navigator items
      const summaryItems: NavigatorItem[] = summaries.map(summary => ({
        id: summary.id,
        message_id: summary.message_id,
        content: summary.content,
        created_at: summary.created_at,
        isFirstMessage: false
      }))

      // Add first message if it exists and doesn't already have a summary
      const items = [...summaryItems]
      if (firstMessage && !summaries.find(s => s.message_id === firstMessage.id)) {
        const firstMessageItem: NavigatorItem = {
          id: `first_${firstMessage.id}`,
          message_id: firstMessage.id,
          content: firstMessage.content || "First message",
          created_at: firstMessage.created_at,
          isFirstMessage: true
        }
        items.unshift(firstMessageItem) // Add to beginning
      }

      // Sort by created_at to maintain chronological order
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      setNavigatorItems(items)
      console.log("📋 Total navigator items:", items.length)
    } catch (error) {
      console.error("Failed to fetch navigator data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [threadId, user])

  useEffect(() => {
    if (!user || !threadId) return

    // Set up real-time subscription for message summaries
    const channel = supabase
      .channel(`message_summaries_${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_summaries",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          console.log("📡 Navigator: Real-time update received:", payload.eventType, payload.new)

          if (payload.eventType === "INSERT") {
            const newSummary = payload.new as MessageSummary
            console.log("➕ Adding new summary for message:", newSummary.message_id)
            
            setNavigatorItems((prev) => {
              // Check if summary already exists to prevent duplicates
              const exists = prev.some((item) => item.id === newSummary.id)
              if (exists) {
                console.log("⚠️ Summary already exists, skipping")
                return prev
              }
              
              const newItem: NavigatorItem = {
                id: newSummary.id,
                message_id: newSummary.message_id,
                content: newSummary.content,
                created_at: newSummary.created_at,
                isFirstMessage: false
              }
              
              const updated = [...prev, newItem].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              )
              console.log("✅ Updated navigator items count:", updated.length)
              return updated
            })
          } else if (payload.eventType === "UPDATE") {
            setNavigatorItems((prev) =>
              prev.map((item) => {
                if (item.id === payload.new.id) {
                  return {
                    ...item,
                    content: payload.new.content,
                    created_at: payload.new.created_at
                  }
                }
                return item
              })
            )
          } else if (payload.eventType === "DELETE") {
            setNavigatorItems((prev) => prev.filter((item) => item.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, user])

  const handleItemClick = (item: NavigatorItem) => {
    console.log("🎯 Navigator: Clicking item for message:", item.message_id, "Content:", item.content.slice(0, 30))
    
    // Close navigator on mobile first to prevent UI interference
    if (window.innerWidth < 1024) {
      onClose()
    }
    
    // Small delay to allow UI updates before scrolling
    setTimeout(() => {
      scrollToMessage(item.message_id)
    }, window.innerWidth < 1024 ? 300 : 100) // Longer delay on mobile for close animation
  }

  return (
    <>
      {isVisible && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed right-0 top-0 h-full w-80 max-w-[100vw] bg-background border-l z-50 transform transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-sm font-medium">Chat Navigator ({navigatorItems.length})</h3>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8" aria-label="Close navigator">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden p-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : navigatorItems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">No messages to navigate yet</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2 p-4 h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 scrollbar-thumb-rounded-full">
                {navigatorItems.map((item, index) => (
                  <li
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="cursor-pointer hover:text-foreground transition-colors hover:bg-muted/50 p-3 rounded-md border border-border/50 hover:border-border"
                    title={`Message ID: ${item.message_id}`}
                  >
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                      <span>#{index + 1}</span>
                      {item.isFirstMessage && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          First
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      {item.content.slice(0, 100)}
                      {item.content.length > 100 && "..."}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default memo(PureChatNavigator, (prevProps, nextProps) => {
  return prevProps.threadId === nextProps.threadId && prevProps.isVisible === nextProps.isVisible
})
