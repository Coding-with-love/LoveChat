"use client"

import { useState, useCallback } from "react"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { supabase } from "@/lib/supabase/client"

interface AIActionResult {
  action: string
  originalText: string
  result: string
  modelUsed?: string
  error?: string
}

export function useAIActions() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<AIActionResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  const { selectedModel, getModelConfig } = useModelStore()
  const { getKey } = useAPIKeyStore()

  const processAction = useCallback(
    async (action: "explain" | "translate" | "rephrase" | "summarize", text: string, targetLanguage?: string) => {
      setIsProcessing(true)

      try {
        // Get the current session token
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.access_token) {
          throw new Error("Authentication required")
        }

        // Get model configuration
        const modelConfig = getModelConfig()
        console.log("🎯 Using model for AI action:", modelConfig.name, "from provider:", modelConfig.provider)

        // Get API key for the selected model's provider
        const apiKey = getKey(modelConfig.provider)

        // Prepare headers with authentication and API key
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        }

        // Add provider-specific API key header
        if (apiKey && modelConfig.provider !== "ollama") {
          headers[modelConfig.headerKey] = apiKey
        }

        console.log("🔑 Sending request with model:", selectedModel)

        const response = await fetch("/api/ai-actions", {
          method: "POST",
          headers,
          body: JSON.stringify({
            action,
            text,
            targetLanguage,
            model: selectedModel, // Use the actual selected model
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error("❌ API error:", response.status, data)
          throw new Error(data.error || `Failed to process action (${response.status})`)
        }

        const actionResult: AIActionResult = {
          action,
          originalText: text,
          result: data.result,
          modelUsed: data.modelUsed || selectedModel,
        }

        setResult(actionResult)
        setShowResult(true)
      } catch (error) {
        console.error("AI Action error:", error)

        const errorResult: AIActionResult = {
          action,
          originalText: text,
          result: "",
          error: error instanceof Error ? error.message : "Unknown error occurred",
        }

        setResult(errorResult)
        setShowResult(true)
      } finally {
        setIsProcessing(false)
      }
    },
    [selectedModel, getModelConfig, getKey],
  )

  const closeResult = useCallback(() => {
    setShowResult(false)
    setResult(null)
  }, [])

  const retryAction = useCallback(() => {
    if (result && !result.error) {
      processAction(result.action as any, result.originalText)
    }
  }, [result, processAction])

  return {
    isProcessing,
    result,
    showResult,
    processAction,
    closeResult,
    retryAction,
  }
}
