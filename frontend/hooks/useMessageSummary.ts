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
      toast.error("Authentication required")
      return
    }

    const googleKey = getKey("google")
    if (!googleKey) {
      toast.error("Google API key is required for title generation")
      return
    }

    setIsLoading(true)
    try {
      console.log("🔑 Making completion request...")

      const response = await apiClient.post(
        "/api/completion",
        {
          prompt,
          ...options.body,
        },
        {
          headers: {
            "X-Google-API-Key": googleKey,
          },
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
      console.error("Completion error:", error)
      if (error instanceof Error && (error.message.includes("Authentication") || error.message.includes("401"))) {
        toast.error("Authentication failed. Please sign in again.")
      } else {
        toast.error("Failed to generate summary")
      }
      throw error
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
