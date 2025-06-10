"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { getModelConfig } from "@/lib/models"

export interface ConversationSummary {
  id: string
  threadId: string
  summary: string
  actionItems: string[]
  keyPoints: string[]
  topics: string[]
  messageCount: number
  createdAt: string
}

export function useConversationSummary() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ConversationSummary | null>(null)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)

  const { selectedModel } = useModelStore()
  const { getKey } = useAPIKeyStore()

  // Load existing summary when thread changes
  const loadExistingSummary = useCallback(async (threadId: string) => {
    if (!threadId) return

    try {
      console.log("🔍 Loading existing summary for thread:", threadId)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log("❌ No authenticated user")
        return
      }

      const { data: existingSummary, error } = await supabase
        .from("conversation_summaries")
        .select("*")
        .eq("thread_id", threadId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("❌ Error loading existing summary:", error)
        return
      }

      if (existingSummary) {
        console.log("✅ Found existing summary:", existingSummary.id)
        setSummary({
          id: existingSummary.id,
          threadId: existingSummary.thread_id,
          summary: existingSummary.summary,
          actionItems: existingSummary.action_items || [],
          keyPoints: existingSummary.key_points || [],
          topics: existingSummary.topics || [],
          messageCount: existingSummary.message_count,
          createdAt: existingSummary.created_at,
        })
      } else {
        console.log("ℹ️ No existing summary found")
        setSummary(null)
      }
    } catch (err) {
      console.error("❌ Error loading existing summary:", err)
    }
  }, [])

  const generateSummary = useCallback(
    async (threadId: string, forceRegenerate = false) => {
      setIsLoading(true)
      setError(null)

      try {
        // Get the current user's session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          throw new Error("Authentication required")
        }

        // Get model configuration and API key
        const modelConfig = getModelConfig(selectedModel)
        const apiKey = getKey(modelConfig.provider)

        // Prepare headers
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        }

        // Add the appropriate API key header
        if (modelConfig.provider !== "ollama") {
          if (!apiKey) {
            throw new Error(`API key required for ${modelConfig.provider}`)
          }
          headers[modelConfig.headerKey.toLowerCase()] = apiKey
        } else {
          // For Ollama, add base URL if available
          const ollamaBaseUrl = getKey("ollama") || "http://localhost:11434"
          headers["x-ollama-base-url"] = ollamaBaseUrl
        }

        console.log("🚀 Generating summary for thread:", threadId, "force:", forceRegenerate)

        const response = await fetch("/api/summarize-conversation", {
          method: "POST",
          headers,
          body: JSON.stringify({
            threadId,
            forceRegenerate,
            model: selectedModel,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to generate summary")
        }

        const summaryData = await response.json()
        console.log("✅ Summary generated/retrieved:", summaryData.id)
        setSummary(summaryData)
        return summaryData
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [selectedModel, getKey],
  )

  const clearSummary = useCallback(() => {
    setSummary(null)
    setError(null)
  }, [])

  // Load existing summary when thread ID changes
  useEffect(() => {
    if (currentThreadId) {
      loadExistingSummary(currentThreadId)
    }
  }, [currentThreadId, loadExistingSummary])

  return {
    summary,
    isLoading,
    error,
    generateSummary,
    clearSummary,
    loadExistingSummary,
    setCurrentThreadId,
  }
}
