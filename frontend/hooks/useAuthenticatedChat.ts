"use client"

import { useChat as useAIChat } from "@ai-sdk/react"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useWebSearchStore } from "@/frontend/stores/WebSearchStore"
import { useAutoResume } from "./useAutoResume"
import { apiClient } from "@/lib/api-client"
import type { UIMessage } from "ai"
import { toast } from "sonner"
import { useMemo } from "react"

interface UseAuthenticatedChatProps {
  threadId: string
  initialMessages: UIMessage[]
  onFinish?: (message: UIMessage) => void
  onStart?: (message: UIMessage) => void
  autoResume?: boolean
  userPreferences?: any
}

export function useAuthenticatedChat({
  threadId,
  initialMessages,
  onFinish,
  onStart,
  autoResume = true,
  userPreferences,
}: UseAuthenticatedChatProps) {
  const { user } = useAuth()
  const getKey = useAPIKeyStore((state) => state.getKey)
  const selectedModel = useModelStore((state) => state.selectedModel)
  const webSearchEnabled = useWebSearchStore((state) => state.enabled)

  // Memoize the model config to prevent re-renders
  const modelConfig = useMemo(() => {
    const { getModelConfig } = useModelStore.getState()
    return getModelConfig()
  }, [selectedModel])

  console.log("🔧 useAuthenticatedChat initialized with:", {
    threadId,
    initialMessagesCount: initialMessages.length,
    userId: user?.id,
    webSearchEnabled,
    autoResume,
  })

  const chat = useAIChat({
    id: threadId,
    initialMessages,
    experimental_throttle: 50,
    onFinish: (message) => {
      console.log("🏁 Chat finished, message:", message.id, "Content length:", message.content.length)
      // Call the original onFinish if provided
      onFinish?.(message)
      // The API route handles saving the message and creating summaries
    },
    fetch: async (url, options) => {
      try {
        console.log("🔑 Custom fetch for chat:", url, "Web search enabled:", webSearchEnabled)

        // Add model-specific API key
        const apiKey = getKey(modelConfig.provider)
        // Only require API key for providers that need it
        if (modelConfig.provider !== "ollama" && !apiKey) {
          throw new Error(`${modelConfig.provider} API key is required`)
        }

        const headers = new Headers(options?.headers || {})
        headers.set(modelConfig.headerKey, apiKey)

        // Parse the existing body to add web search flag and preserve all data
        const existingBody = options?.body ? JSON.parse(options.body as string) : {}
        console.log("🔍 useAuthenticatedChat existing body:", existingBody)
        const newBody = {
          ...existingBody,
          webSearchEnabled,
        }
        console.log("🔍 useAuthenticatedChat new body:", newBody)

        // Use our custom API client
        return apiClient.fetch(url, {
          ...options,
          headers,
          body: JSON.stringify(newBody),
        })
      } catch (error) {
        console.error("Failed to make chat request:", error)
        throw error
      }
    },
    body: {
      model: selectedModel,
      webSearchEnabled,
      data: userPreferences ? { userPreferences } : undefined,
    },
    api: `/api/chat?threadId=${threadId}`,
    onError: (error) => {
      console.error("Chat error:", error)
      if (error.message.includes("Authentication") || error.message.includes("401")) {
        toast.error("Authentication failed. Please sign in again.")
      } else {
        toast.error("Something went wrong with the chat")
      }
    },
  })

  // Use the auto-resume hook
  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume: chat.experimental_resume,
    data: chat.data,
    setMessages: chat.setMessages,
  })

  // Enhanced append function that calls onStart
  const enhancedAppend = async (message: UIMessage) => {
    console.log("🚀 Starting new chat message:", message.id)
    onStart?.(message)
    return chat.append(message)
  }

  return {
    ...chat,
    append: enhancedAppend,
    isAuthenticated: !!user,
  }
}
