"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useChat as useAIChat } from "@ai-sdk/react"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useWebSearchStore } from "@/frontend/stores/WebSearchStore"
import { apiClient } from "@/lib/api-client"
import { getActiveStreamsForThread, resumeStream } from "./resumable-streams-client"
import type { UIMessage, Message, CreateMessage } from "ai"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { createMessage } from "@/lib/supabase/queries"
import { getMessageParts } from "@ai-sdk/ui-utils"

interface UseCustomResumableChatProps {
  threadId: string
  initialMessages: UIMessage[]
  onFinish?: (message: UIMessage) => void
  onStart?: (message: UIMessage) => void
  autoResume?: boolean
}

export function useCustomResumableChat({
  threadId,
  initialMessages,
  onFinish,
  onStart,
  autoResume = true,
}: UseCustomResumableChatProps) {
  const { user } = useAuth()
  const getKey = useAPIKeyStore((state) => state.getKey)
  const selectedModel = useModelStore((state) => state.selectedModel)
  const webSearchEnabled = useWebSearchStore((state) => state.enabled)

  // Resume state
  const [isResuming, setIsResuming] = useState(false)
  const [resumeProgress, setResumeProgress] = useState(0)
  const [resumeComplete, setResumeComplete] = useState(false)
  const [resumedMessageId, setResumedMessageId] = useState<string | null>(null)
  const hasAttemptedResume = useRef(false)

  // Local messages state for immediate updates
  const [localMessages, setLocalMessages] = useState<UIMessage[]>(initialMessages)

  console.log("🔧 useCustomResumableChat initialized:", {
    threadId,
    messagesCount: localMessages.length,
    userId: user?.id,
    autoResume,
  })

  const chat = useAIChat({
    id: threadId,
    initialMessages,
    experimental_throttle: 50,
    onFinish: async (message) => {
      console.log("🏁 Chat finished:", message.id)
      // Save Ollama assistant message after normal chat
      const { getModelConfig } = useModelStore.getState()
      const modelConfig = getModelConfig()
      if (modelConfig.provider === "ollama" && message.role === "assistant") {
        try {
          const parts = message.parts ?? getMessageParts(message) ?? [{ type: 'text', text: message.content || '' }]
          const messageToSave: UIMessage = {
            id: message.id || uuidv4(),
            role: "assistant",
            content: message.content || "",
            createdAt: message.createdAt || new Date(),
            parts: parts as UIMessage["parts"],
          }
          await createMessage(threadId, messageToSave)
          console.log("✅ Ollama assistant message saved to DB (onFinish)")
        } catch (e) {
          console.error("❌ Failed to save Ollama assistant message to DB (onFinish):", e)
        }
      }
      onFinish?.(message)
    },
    fetch: async (url, options) => {
      try {
        const { getModelConfig } = useModelStore.getState()
        const modelConfig = getModelConfig()

        console.log("🔑 [FETCH] Getting API key for provider:", modelConfig.provider)
        
        // Get fresh API key each time to handle state changes
        const apiKey = getKey(modelConfig.provider)
        
        console.log("🔑 [FETCH] API key check:", {
          provider: modelConfig.provider,
          hasKey: !!apiKey,
          keyLength: apiKey?.length || 0,
          timestamp: new Date().toISOString()
        })

        // Only require API key for providers that need it
        if (modelConfig.provider !== "ollama" && !apiKey) {
          const errorMsg = `${modelConfig.provider} API key is required but not found. Please check your API key settings.`
          console.error("🔑 [FETCH] API key error:", errorMsg)
          throw new Error(errorMsg)
        }

        // Parse and update the body to include webSearchEnabled and API key
        let newBody = {}
        if (options?.body) {
          try {
            newBody = JSON.parse(options.body as string)
          } catch (e) {
            console.error("Failed to parse request body:", e)
          }
        }

        newBody = {
          ...newBody,
          model: selectedModel,
          webSearchEnabled,
          apiKey: apiKey, // Include the API key in the body
        }

        // Create new headers and add the API key in multiple formats
        const headers = new Headers(options?.headers || {})

        // Only set headers if we have an API key
        if (apiKey) {
          // Set the API key in multiple header formats to ensure it's received
          if (modelConfig.headerKey) {
            headers.set(modelConfig.headerKey, apiKey)
          }

          // Add provider-specific headers
          if (modelConfig.provider === "google") {
            headers.set("x-google-api-key", apiKey)
            headers.set("google-api-key", apiKey)
            headers.set("x-api-key", apiKey)
          } else if (modelConfig.provider === "openai") {
            headers.set("x-openai-api-key", apiKey)
            headers.set("openai-api-key", apiKey)
            headers.set("x-api-key", apiKey)
          } else if (modelConfig.provider === "openrouter") {
            headers.set("x-openrouter-api-key", apiKey)
            headers.set("openrouter-api-key", apiKey)
            headers.set("x-api-key", apiKey)
          }
        }

        // Log headers for debugging (but mask API keys)
        const headerEntries = Object.fromEntries(headers.entries())
        const maskedHeaders = Object.keys(headerEntries).reduce((acc, key) => {
          if (key.toLowerCase().includes('key') || key.toLowerCase().includes('auth')) {
            acc[key] = '***MASKED***'
          } else {
            acc[key] = headerEntries[key]
          }
          return acc
        }, {} as Record<string, string>)
        
        console.log("📋 [FETCH] Request headers:", maskedHeaders)
        console.log("📦 [FETCH] Request body model:", newBody.model)

        // Use apiClient.fetch to ensure proper authentication headers are included
        return apiClient.fetch(url, {
          ...options,
          headers,
          body: JSON.stringify(newBody),
        })
      } catch (error) {
        console.error("❌ [FETCH] Failed to make chat request:", error)
        throw error
      }
    },
    body: {
      model: selectedModel,
      webSearchEnabled,
    },
    api: `/api/chat?threadId=${threadId}`,
    onError: (error) => {
      console.error("Chat error:", error)
      toast.error("Something went wrong with the chat")
    },
  })

  // Sync local messages with chat messages
  useEffect(() => {
    setLocalMessages(chat.messages)
  }, [chat.messages])

  // Sync initialMessages changes with chat (important for tab switching)
  useEffect(() => {
    console.log("🔄 initialMessages changed, syncing with chat", {
      newCount: initialMessages.length,
      currentCount: localMessages.length,
      threadId
    })
    
    // Always update localMessages when initialMessages changes
    setLocalMessages(initialMessages)
    console.log("✅ Local messages synced with new initialMessages")
  }, [initialMessages, threadId])

  // Function to find potentially interrupted message
  const findInterruptedMessage = useCallback(() => {
    const messages = localMessages
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message.role === "assistant") {
        const content = message.content.trim()
        // Check if message looks incomplete
        if (
          content.length < 50 ||
          (!content.endsWith(".") && !content.endsWith("!") && !content.endsWith("?") && !content.endsWith(":"))
        ) {
          console.log("🔍 Found interrupted message:", message.id, content.substring(0, 50))
          return message
        }
      }
    }
    return null
  }, [localMessages])

  // Manual resume function
  const manualResume = useCallback(async () => {
    if (isResuming) {
      console.log("⏸️ Already resuming, skipping")
      return
    }

    try {
      console.log("🔄 Starting manual resume...")
      setIsResuming(true)
      setResumeProgress(10)
      setResumeComplete(false)

      // Get active streams
      const activeStreams = await getActiveStreamsForThread(threadId)
      console.log("📋 Active streams:", activeStreams)

      if (activeStreams.length === 0) {
        console.log("❌ No active streams found")
        setIsResuming(false)
        setResumeProgress(0)
        return
      }

      setResumeProgress(30)

      // Find interrupted message
      const interruptedMessage = findInterruptedMessage()
      console.log("🔍 Interrupted message:", interruptedMessage?.id)

      // Resume the stream
      const streamId = activeStreams[0]
      const resumedStream = await resumeStream(streamId)

      if (!resumedStream) {
        throw new Error("Failed to get resumed stream")
      }

      setResumeProgress(50)

      // Determine which message to update
      let targetMessage: UIMessage
      let existingContent = ""

      if (interruptedMessage) {
        targetMessage = interruptedMessage
        existingContent = interruptedMessage.content
        setResumedMessageId(interruptedMessage.id)
        console.log("📝 Resuming existing message with content:", existingContent.substring(0, 100))
      } else {
        // Create new message
        targetMessage = {
          id: uuidv4(),
          role: "assistant",
          content: "",
          createdAt: new Date(),
        }
        setResumedMessageId(targetMessage.id)
        console.log("📝 Creating new message for resume")

        // Add to local messages immediately
        setLocalMessages((prev) => [...prev, targetMessage])
      }

      // Process the stream
      const reader = resumedStream.getReader()
      let fullContent = ""
      let chunkCount = 0

      console.log("📖 Starting to read stream...")

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log("✅ Stream reading complete")
            break
          }

          const text = new TextDecoder().decode(value)
          const lines = text.split("\n").filter(Boolean)

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const content = JSON.parse(line.substring(2))
                if (content) {
                  // This is the full content, not a chunk to append
                  fullContent = content
                  chunkCount++

                  const newProgress = Math.min(50 + chunkCount * 10, 95)
                  setResumeProgress(newProgress)

                  console.log("📝 Received full content, length:", fullContent.length)

                  // Update local messages with the full content
                  setLocalMessages((prevMessages) => {
                    return prevMessages.map((msg) => {
                      if (msg.id === targetMessage.id) {
                        return {
                          ...msg,
                          content: fullContent,
                        }
                      }
                      return msg
                    })
                  })
                }
              } catch (e) {
                console.error("Error parsing chunk:", e)
              }
            }
          }
        }

        if (fullContent) {
          console.log("✅ Resume completed with full content:", fullContent.length, "characters")

          // Set progress to 100%
          setResumeProgress(100)

          // Trigger completion animation
          setResumeComplete(true)

          // Final message update
          const finalMessage = {
            ...targetMessage,
            content: fullContent,
          }

          // Save assistant message to the database
          if (finalMessage.role === "assistant") {
            try {
              const parts = finalMessage.parts ?? getMessageParts(finalMessage) ?? [{ type: 'text', text: finalMessage.content || '' }]
              const messageToSave: UIMessage = {
                id: finalMessage.id || uuidv4(),
                role: "assistant",
                content: finalMessage.content || "",
                createdAt: finalMessage.createdAt || new Date(),
                parts: parts as UIMessage["parts"],
              }
              await createMessage(threadId, messageToSave)
              console.log("✅ Assistant message saved to DB")
            } catch (e) {
              console.error("❌ Failed to save assistant message to DB:", e)
            }
          }

          // Update both local and chat messages
          setLocalMessages((prevMessages) => {
            return prevMessages.map((msg) => {
              if (msg.id === targetMessage.id) {
                return finalMessage
              }
              return msg
            })
          })

          // Also update the chat messages to persist the change
          chat.setMessages((prevMessages) => {
            const existingIndex = prevMessages.findIndex((m) => m.id === targetMessage.id)
            if (existingIndex >= 0) {
              const newMessages = [...prevMessages]
              newMessages[existingIndex] = finalMessage
              return newMessages
            } else {
              return [...prevMessages, finalMessage]
            }
          })

          onFinish?.(finalMessage)

          // Auto-refresh after showing completion animation
          setTimeout(() => {
            console.log("🔄 Auto-refreshing page after resume completion")
            window.location.reload()
          }, 2000) // Reduced to 2 seconds to match animation duration
        } else {
          console.log("❌ No content received")
          setIsResuming(false)
          setResumeProgress(0)
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error("❌ Error during resume:", error)
      toast.error("Failed to resume conversation")
      setIsResuming(false)
      setResumeProgress(0)
      setResumeComplete(false)
      setResumedMessageId(null)
    }
  }, [isResuming, threadId, findInterruptedMessage, onFinish, chat.setMessages])

  // Auto-resume on mount
  useEffect(() => {
    if (!user || hasAttemptedResume.current || !autoResume) return

    const checkAndResume = async () => {
      hasAttemptedResume.current = true
      console.log("🔍 Checking for auto-resume...")

      // Small delay to ensure everything is loaded
      await new Promise((resolve) => setTimeout(resolve, 500))

      try {
        const activeStreams = await getActiveStreamsForThread(threadId)
        if (activeStreams.length > 0) {
          console.log("🔄 Auto-resuming...")
          await manualResume()
        } else {
          console.log("✅ No streams to resume")
        }
      } catch (error) {
        console.error("❌ Error checking for streams:", error)
      }
    }

    checkAndResume()
  }, [user, autoResume, threadId, manualResume])

  // Enhanced append function
  const enhancedAppend = async (message: UIMessage | CreateMessage) => {
    console.log("🚀 Starting new chat message:", 'id' in message ? message.id : 'new message', {
      role: message.role,
      content: message.content.substring(0, 100) + '...',
      localMessagesCount: localMessages.length,
      chatMessagesCount: chat.messages.length
    })
    
    // Convert CreateMessage to UIMessage if needed
    const uiMessage: UIMessage = 'id' in message ? message : {
      id: uuidv4(),
      role: message.role,
      content: message.content,
      createdAt: new Date(),
      parts: [{ type: 'text', text: message.content }]
    }
    
    // Add to local messages immediately for UI responsiveness
    setLocalMessages(prev => {
      console.log("📝 Adding message to local state:", uiMessage.id, "New count:", prev.length + 1)
      return [...prev, uiMessage]
    })
    
    if ('id' in message) {
      onStart?.(message)
    }
    
    try {
      // Also append to the chat hook for processing
      console.log("🔄 Calling chat.append with message:", uiMessage.id)
      const result = await chat.append(message)
      console.log("✅ chat.append completed successfully for:", uiMessage.id)
      return result
    } catch (error) {
      console.error("❌ chat.append failed for message:", uiMessage.id, error)
      // The message is already in localMessages, so the UI will show it
      // but we should still throw to let the caller know there was an issue
      throw error
    }
  }

  return {
    ...chat,
    messages: localMessages, // Use local messages for immediate updates
    append: enhancedAppend,
    isAuthenticated: !!user,
    isResuming,
    resumeProgress,
    resumeComplete,
    resumedMessageId,
    manualResume,
  }
}
