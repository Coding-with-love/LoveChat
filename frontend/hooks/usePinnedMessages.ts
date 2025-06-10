"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { PinnedMessage } from "@/lib/supabase/types"

export function usePinnedMessages(threadId: string) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [loading, setLoading] = useState(true)
  // const supabase = createClient() // Removed line

  // Fetch pinned messages
  const fetchPinnedMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("pinned_messages")
        .select(`
          *,
          messages (
            id,
            content,
            role,
            created_at
          )
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching pinned messages:", error)
        return
      }

      setPinnedMessages(data || [])
    } catch (error) {
      console.error("Error fetching pinned messages:", error)
    } finally {
      setLoading(false)
    }
  }

  // Pin a message
  const pinMessage = async (messageId: string, note?: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("pinned_messages").insert({
        thread_id: threadId,
        message_id: messageId,
        user_id: user.id,
        note: note || null,
      })

      if (error) {
        console.error("Error pinning message:", error)
        return
      }

      // Refresh the list
      await fetchPinnedMessages()
    } catch (error) {
      console.error("Error pinning message:", error)
    }
  }

  // Unpin a message
  const unpinMessage = async (pinnedMessageId: string) => {
    try {
      const { error } = await supabase.from("pinned_messages").delete().eq("id", pinnedMessageId)

      if (error) {
        console.error("Error unpinning message:", error)
        return
      }

      // Remove from local state
      setPinnedMessages((prev) => prev.filter((pm) => pm.id !== pinnedMessageId))
    } catch (error) {
      console.error("Error unpinning message:", error)
    }
  }

  // Update note for a pinned message
  const updatePinnedMessageNote = async (pinnedMessageId: string, note: string) => {
    try {
      const { error } = await supabase
        .from("pinned_messages")
        .update({ note: note || null })
        .eq("id", pinnedMessageId)

      if (error) {
        console.error("Error updating pinned message note:", error)
        return
      }

      // Update local state
      setPinnedMessages((prev) => prev.map((pm) => (pm.id === pinnedMessageId ? { ...pm, note } : pm)))
    } catch (error) {
      console.error("Error updating pinned message note:", error)
    }
  }

  // Check if a message is pinned
  const isMessagePinned = (messageId: string) => {
    return pinnedMessages.some((pm) => pm.message_id === messageId)
  }

  // Get pinned message data for a specific message
  const getPinnedMessageData = (messageId: string) => {
    return pinnedMessages.find((pm) => pm.message_id === messageId)
  }

  useEffect(() => {
    if (threadId) {
      fetchPinnedMessages()
    }
  }, [threadId])

  // Set up real-time subscription
  useEffect(() => {
    if (!threadId) return

    const channel = supabase
      .channel(`pinned_messages_${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pinned_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          fetchPinnedMessages()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId])

  return {
    pinnedMessages,
    loading,
    pinMessage,
    unpinMessage,
    updatePinnedMessageNote,
    isMessagePinned,
    getPinnedMessageData,
    refetch: fetchPinnedMessages,
  }
}
