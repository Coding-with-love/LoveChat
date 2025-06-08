"use client"

import { useEffect, useState } from "react"
import { getMessageSummaries } from "@/lib/supabase/queries"
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

interface MessageNavigatorProps {
  threadId: string
  scrollToMessage: (id: string) => void
  isVisible: boolean
  onClose: () => void
}

function PureChatNavigator({ threadId, scrollToMessage, isVisible, onClose }: MessageNavigatorProps) {
  const { user } = useAuth()
  const [messageSummaries, setMessageSummaries] = useState<MessageSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSummaries = async () => {
    if (!user || !threadId) return

    try {
      setLoading(true)
      const summaries = await getMessageSummaries(threadId)
      console.log(
        "📋 Fetched summaries:",
        summaries.length,
        summaries.map((s) => ({ id: s.message_id, content: s.content.slice(0, 30) })),
      )
      setMessageSummaries(summaries)
    } catch (error) {
      console.error("Failed to fetch message summaries:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummaries()
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
            setMessageSummaries((prev) => {
              // Check if summary already exists to prevent duplicates
              const exists = prev.some((s) => s.id === newSummary.id)
              if (exists) {
                console.log("⚠️ Summary already exists, skipping")
                return prev
              }
              const updated = [...prev, newSummary].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              )
              console.log("✅ Updated summaries count:", updated.length)
              return updated
            })
          } else if (payload.eventType === "UPDATE") {
            setMessageSummaries((prev) =>
              prev.map((summary) => (summary.id === payload.new.id ? (payload.new as MessageSummary) : summary)),
            )
          } else if (payload.eventType === "DELETE") {
            setMessageSummaries((prev) => prev.filter((summary) => summary.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, user])

  const handleSummaryClick = (messageId: string, summaryContent: string) => {
    console.log("🎯 Navigator: Clicking summary for message:", messageId, "Content:", summaryContent.slice(0, 30))
    scrollToMessage(messageId)
    // Close navigator on mobile after clicking
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

  return (
    <>
      {isVisible && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed right-0 top-0 h-full w-80 bg-background border-l z-50 transform transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-sm font-medium">Chat Navigator ({messageSummaries.length})</h3>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8" aria-label="Close navigator">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden p-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : messageSummaries.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">No message summaries yet</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2 p-4 h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 scrollbar-thumb-rounded-full">
                {messageSummaries.map((summary, index) => (
                  <li
                    key={summary.id}
                    onClick={() => handleSummaryClick(summary.message_id, summary.content)}
                    className="cursor-pointer hover:text-foreground transition-colors hover:bg-muted/50 p-3 rounded-md border border-border/50 hover:border-border"
                    title={`Message ID: ${summary.message_id}`}
                  >
                    <div className="text-xs text-muted-foreground mb-1">#{index + 1}</div>
                    <div className="text-sm">
                      {summary.content.slice(0, 100)}
                      {summary.content.length > 100 && "..."}
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
