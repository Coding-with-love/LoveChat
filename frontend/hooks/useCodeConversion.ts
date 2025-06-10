"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { saveCodeConversion, getCodeConversions } from "@/lib/supabase/queries"

interface CodeConversion {
  id: string
  original_code: string
  original_language: string
  converted_code: string
  target_language: string
  created_at: string
}

export function useCodeConversions(threadId?: string, messageId?: string) {
  const [conversions, setConversions] = useState<CodeConversion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)

  // Load existing conversions with throttling
  const loadConversions = useCallback(async () => {
    if (!threadId || !messageId || loadingRef.current) {
      return
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    loadingRef.current = true

    try {
      setIsLoading(true)
      setError(null)
      console.log("🔄 Loading conversions for:", { threadId, messageId })

      const data = await getCodeConversions(threadId, messageId)

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      console.log("✅ Loaded conversions:", data)
      setConversions(data)
    } catch (err) {
      // Don't log errors for aborted requests
      if (err instanceof Error && err.name === "AbortError") {
        return
      }

      console.error("❌ Failed to load code conversions:", err)
      setError(err instanceof Error ? err : new Error("Failed to load code conversions"))
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [threadId, messageId])

  // Only load once when threadId or messageId changes
  useEffect(() => {
    if (threadId && messageId) {
      loadConversions()
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      loadingRef.current = false
    }
  }, [threadId, messageId]) // Removed loadConversions from dependencies to prevent loops

  // Save a new conversion
  const saveConversion = useCallback(
    async (originalCode: string, originalLanguage: string, convertedCode: string, targetLanguage: string) => {
      if (!threadId || !messageId) {
        throw new Error("Thread ID and Message ID are required")
      }

      try {
        setIsLoading(true)
        setError(null)
        console.log("💾 Saving conversion:", {
          threadId,
          messageId,
          originalLanguage,
          targetLanguage,
        })

        const newConversion = await saveCodeConversion(
          threadId,
          messageId,
          originalCode,
          originalLanguage,
          convertedCode,
          targetLanguage,
        )

        console.log("✅ Conversion saved:", newConversion)
        setConversions((prev) => [...prev, newConversion])
        return newConversion
      } catch (err) {
        console.error("❌ Failed to save code conversion:", err)
        setError(err instanceof Error ? err : new Error("Failed to save code conversion"))
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [threadId, messageId],
  )

  // Find a conversion by original code and target language
  const findConversion = useCallback(
    (originalCode: string, targetLanguage: string) => {
      return conversions.find(
        (conv) =>
          conv.original_code === originalCode && conv.target_language.toLowerCase() === targetLanguage.toLowerCase(),
      )
    },
    [conversions],
  )

  // Find conversions by original code and language
  const findConversionsForCode = useCallback(
    (originalCode: string, originalLanguage: string) => {
      return conversions.filter(
        (conv) => conv.original_code === originalCode && conv.original_language === originalLanguage,
      )
    },
    [conversions],
  )

  return {
    conversions,
    isLoading,
    error,
    saveConversion,
    findConversion,
    findConversionsForCode,
    reload: loadConversions,
  }
}
