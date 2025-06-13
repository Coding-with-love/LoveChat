"use client"

import { useState, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/types"

interface CodeConversion {
  id: string
  thread_id: string
  message_id: string
  original_code: string
  original_language: string
  converted_code: string
  target_language: string
  created_at: string
}

export function useCodeConversions() {
  const [conversions, setConversions] = useState<CodeConversion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient<Database>()

  const findConversions = useCallback(
    async (threadId: string, messageId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from("code_conversions")
          .select("*")
          .eq("thread_id", threadId)
          .eq("message_id", messageId)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        setConversions(data || [])
      } catch (err) {
        console.error("Error fetching code conversions:", err)
        setError(err instanceof Error ? err : new Error("Failed to fetch code conversions"))
      } finally {
        setIsLoading(false)
      }
    },
    [supabase],
  )

  const addConversion = useCallback((newConversion: CodeConversion) => {
    setConversions((prev) => {
      // Check if this conversion already exists
      const exists = prev.some(
        (conv) =>
          conv.original_code === newConversion.original_code && conv.target_language === newConversion.target_language,
      )

      if (exists) {
        // Replace the existing conversion with the new one
        return prev.map((conv) =>
          conv.original_code === newConversion.original_code && conv.target_language === newConversion.target_language
            ? newConversion
            : conv,
        )
      }

      // Add the new conversion at the beginning of the array
      return [newConversion, ...prev]
    })
  }, [])

  return {
    conversions,
    isLoading,
    error,
    findConversions,
    addConversion,
  }
}
