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
      console.log("🔍 useCodeConversions: findConversions called", { threadId, messageId })
      setIsLoading(true)
      setError(null)

      try {
        console.log("🔍 useCodeConversions: Making API request...")
        
        // Get auth headers
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error("❌ useCodeConversions: No active session")
          throw new Error("No active session")
        }

        console.log("🔍 useCodeConversions: Session found, making request to:", `/api/code-conversions?threadId=${threadId}&messageId=${messageId}`)

        const response = await fetch(`/api/code-conversions?threadId=${threadId}&messageId=${messageId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        })

        console.log("🔍 useCodeConversions: Response status:", response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("❌ useCodeConversions: API error:", errorText)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("✅ useCodeConversions: Found", data?.length || 0, "conversions")
        if (data && data.length > 0) {
          console.log("📊 useCodeConversions: Sample conversions:", data.slice(0, 2).map((c: any) => ({
            id: c.id,
            originalLanguage: c.original_language,
            targetLanguage: c.target_language,
            originalCodeLength: c.original_code.length,
            convertedCodeLength: c.converted_code.length
          })))
        }

        setConversions(data || [])
      } catch (err) {
        console.error("❌ useCodeConversions: Error fetching code conversions:", err)
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
