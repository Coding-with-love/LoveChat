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

        // Add model-specific API key (optional - will fallback to server defaults)
        const apiKey = getKey(modelConfig.provider)
        console.log("🔑 User API key check:", {
          provider: modelConfig.provider,
          hasUserKey: !!apiKey,
          keyLength: apiKey?.length || 0
        })

        const headers = new Headers(options?.headers || {})
        if (apiKey) {
          headers.set(modelConfig.headerKey, apiKey)
        }

        // For Ollama, add the base URL header (use window global to avoid import issues)
        if (modelConfig.provider === "ollama") {
          try {
            // Access the store from window global if available
            const storedSettings = window.localStorage?.getItem('ollama-settings')
            const ollamaBaseUrl = storedSettings 
              ? JSON.parse(storedSettings).state?.baseUrl || "http://localhost:11434"
              : "http://localhost:11434"
            headers.set("x-ollama-base-url", ollamaBaseUrl)
            console.log("🦙 Set Ollama base URL header:", ollamaBaseUrl)
          } catch (error) {
            console.warn("⚠️ Failed to access Ollama store:", error)
            headers.set("x-ollama-base-url", "http://localhost:11434")
          }
        }

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
