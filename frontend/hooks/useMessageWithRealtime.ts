"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Message } from "@/lib/supabase/types"

interface UseMessagesWithRealtimeProps {
  channelId: string
}

const useMessagesWithRealtime = ({ channelId }: UseMessagesWithRealtimeProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInitialMessages = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("channel_id", channelId)
          .order("created_at", { ascending: true })

        if (error) {
          setError(error.message)
        } else {
          setMessages(data || [])
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialMessages()
  }, [channelId])

  useEffect(() => {
    const messagesSubscription = supabase
      .channel(`channel_${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          console.log("🔄 Real-time message update received:", {
            eventType: payload.eventType,
            messageId: payload.new?.id || payload.old?.id,
            contentPreview: payload.new?.content?.substring(0, 100),
          })

          switch (payload.eventType) {
            case "INSERT":
              setMessages((prevMessages) => [...prevMessages, payload.new as Message])
              break
            case "UPDATE":
              setMessages((prevMessages) =>
                prevMessages.map((msg) => (msg.id === payload.new?.id ? { ...msg, ...payload.new } : msg)),
              )
              break
            case "DELETE":
              setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== payload.old?.id))
              break
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesSubscription)
    }
  }, [channelId])

  return { messages, loading, error }
}

export default useMessagesWithRealtime
