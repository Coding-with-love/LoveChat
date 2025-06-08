"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/frontend/components/AuthProvider"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface UseSupabaseSubscriptionProps {
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function useSupabaseSubscription({ table, filter, onInsert, onUpdate, onDelete }: UseSupabaseSubscriptionProps) {
  const { user } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!user) return

    const channelName = `${table}_${user.id}_${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: filter || `user_id=eq.${user.id}`,
        },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              onInsert?.(payload)
              break
            case "UPDATE":
              onUpdate?.(payload)
              break
            case "DELETE":
              onDelete?.(payload)
              break
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, table, filter, onInsert, onUpdate, onDelete])

  return {
    isConnected: channelRef.current?.state === "joined",
  }
}
