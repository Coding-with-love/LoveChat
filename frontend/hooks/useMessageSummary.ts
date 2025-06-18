"use client"

import { useState } from "react"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useAuth } from "@/frontend/components/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface MessageSummaryPayload {
  title: string
  isTitle?: boolean
  messageId: string
  threadId: string
}

export const useMessageSummary = () => {
  const { user } = useAuth()
  const getKey = useAPIKeyStore((state) => state.getKey)
  const [isLoading, setIsLoading] = useState(false)

  const complete = async (
    prompt: string,
    options: { body: { threadId: string; messageId?: string; isTitle?: boolean } },
  ) => {
    if (!user) {
      console.log("⚠️ No user authenticated for completion")
      return
    }

    const googleKey = getKey("google")
    
    console.log("🔑 Starting completion with:", {
      promptLength: prompt.length,
      threadId: options.body.threadId,
      isTitle: options.body.isTitle,
      hasUserKey: !!googleKey,
    })

    setIsLoading(true)
    try {
      console.log("🔑 Making completion request...")

      const headers: Record<string, string> = {}
      if (googleKey) {
        headers["X-Google-API-Key"] = googleKey
      }

      const response = await apiClient.post(
        "/api/completion",
        {
          prompt,
          ...options.body,
        },
        {
          headers,
        },
      )

      console.log("✅ Completion successful:", response)

      if (options.body.isTitle) {
        toast.success("Thread title updated")
      } else {
        toast.success("Message summary created")
      }

      return response
    } catch (error) {
      console.error("❌ Completion error details:", error)

      if (error instanceof Error) {
        console.error("❌ Error message:", error.message)

        if (error.message.includes("Authentication") || error.message.includes("401")) {
          // Only show auth errors, not other completion failures
          toast.error("Authentication failed. Please sign in again.")
        } else if (error.message.includes("Thread not found")) {
          // Don't show thread errors to user - they're often transient
          console.log("⚠️ Thread not found for completion - this may be temporary")
        } else {
          // For other errors, just log them without showing user toast
          console.log("⚠️ Completion failed (non-blocking):", error.message)
        }
      } else {
        console.log("⚠️ Completion failed with unknown error (non-blocking)")
      }
      // Don't throw error for non-critical completion operations
    } finally {
      setIsLoading(false)
    }
  }

  return {
    complete,
    isLoading,
    isAuthenticated: !!user,
  }
}
