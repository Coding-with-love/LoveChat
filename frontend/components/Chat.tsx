"use client"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import Messages from "./Messages"
import ChatInput from "./ChatInput"
import type { UIMessage } from "ai"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useSidebar } from "./ui/sidebar"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown } from 'lucide-react'
import { useCustomResumableChat } from "@/frontend/hooks/useCustomResumableChat"
import { getModelConfig } from "@/lib/models"
import { GlobalResumingIndicator } from "./ResumingIndicator"
import { PinnedMessages } from "./PinnedMessages"
import { useKeyboardShortcutManager } from "@/frontend/hooks/useKeyboardShortcutManager"
import { useNavigate, useParams } from "react-router"
import { createMessage, createThread } from "@/lib/supabase/queries"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"

import type { Message, CreateMessage } from "ai"
import { getMessageParts } from "@ai-sdk/ui-utils"
import { useTabVisibility } from "@/frontend/hooks/useTabVisibility"
import RealtimeThinking from "./RealTimeThinking"
import { useUserPreferencesStore } from "@/frontend/stores/UserPreferencesStore"
import { RegenerationProvider } from "@/frontend/contexts/RegenerationContext"
import { useMessageAttempts } from "@/frontend/hooks/useMessageAttempts"
import { useRegenerationTracker } from "@/frontend/hooks/useRegenerationTracker"
import { useMessageInterceptor } from "@/frontend/hooks/useMessageInterceptor"
import { useReasoningStream } from "@/frontend/hooks/useReasoningStream"

// Extend UIMessage to include reasoning field
interface ExtendedUIMessage extends UIMessage {
  reasoning?: string
  model?: string
}

interface ChatProps {
  threadId: string
  initialMessages: UIMessage[]
  registerRef?: (id: string, ref: HTMLDivElement | null) => void
  onRefreshMessages?: () => void
}

export default function Chat({ threadId, initialMessages, registerRef, onRefreshMessages }: ChatProps) {
  const { getKey } = useAPIKeyStore()
  const selectedModel = useModelStore((state) => state.selectedModel)
  const modelConfig = useMemo(() => getModelConfig(selectedModel), [selectedModel])

  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const isAutoScrolling = useRef(false)
  const lastUserScrollTime = useRef(0)
  const autoScrollEnabled = useRef(true)

  // Add these state variables inside the Chat component function
  const [realtimeThinking, setRealtimeThinking] = useState("")
  const [showRealtimeThinking, setShowRealtimeThinking] = useState(false)
  const currentMessageIdRef = useRef<string | null>(null)
  
  // Google thinking model streaming state
  const [streamingReasoning, setStreamingReasoning] = useState("")
  const [isStreamingReasoning, setIsStreamingReasoning] = useState(false)
  const [reasoningDuration, setReasoningDuration] = useState<number | undefined>(undefined)
  const [streamingReasoningMessageId, setStreamingReasoningMessageId] = useState<string | null>(null)

  const navigate = useNavigate()
  const { toggleSidebar, state: sidebarState, isMobile } = useSidebar()
  const sidebarCollapsed = sidebarState === "collapsed"
  const { id } = useParams()

  // Get user preferences for chat
  const userPreferences = useUserPreferencesStore()
  
  // Message attempts hook
  const { addMessageAttempt } = useMessageAttempts()
  
  // Regeneration tracker hook
  const { startRegeneration, captureNewAttempt, finishRegeneration } = useRegenerationTracker()

  // Monitor API key state for debugging
  const currentApiKey = getKey(modelConfig.provider)
  useEffect(() => {
    console.log("🔑 Chat API key check:", {
      provider: modelConfig.provider,
      hasKey: !!currentApiKey,
      keyLength: currentApiKey?.length || 0,
      selectedModel,
    })
  }, [currentApiKey, modelConfig.provider, selectedModel])

  // Check if the current model supports thinking
  const supportsThinking = useMemo(() => {
    return modelConfig?.supportsThinking || false
  }, [modelConfig])

  // Use our custom resumable chat hook
  const {
    messages,
    input,
    status,
    setInput,
    setMessages,
    append,
    stop,
    reload,
    error,
    isAuthenticated,
    isResuming,
    resumeProgress,
    resumeComplete,
    resumedMessageId,
    manualResume,
  } = useCustomResumableChat({
    threadId,
    initialMessages,
    userPreferences,
    onFinish: (message: Message | CreateMessage) => {
      console.log("🏁 Chat stream finished:", message.id)
      const parts = message.parts ??
        getMessageParts(message) ?? [{ type: "text" as const, text: message.content || "" }]

      // Extract reasoning if available from parts or content
      const reasoningPart = parts.find((part) => part.type === "reasoning")
      let reasoning = reasoningPart?.reasoning

      // Also check if thinking content is embedded in the text content
      const textContent = message.content || ""
      if (!reasoning && textContent.includes("<think>") && textContent.includes("</think>")) {
        console.log("🧠 Extracting thinking content from message content")
        const thinkMatch = textContent.match(/<think>([\s\S]*?)<\/think>/)
        if (thinkMatch) {
          reasoning = thinkMatch[1].trim()
          console.log("🧠 Extracted reasoning from content:", reasoning.substring(0, 100) + "...")
        }
      }

      // Log reasoning extraction for debugging
      if (reasoning) {
        console.log("🧠 Extracted reasoning from stream:", reasoning.substring(0, 100) + "...")
      }

      // Reset streaming reasoning state when chat finishes
      setIsStreamingReasoning(false)
      setStreamingReasoning("")
      setStreamingReasoningMessageId(null)
      setReasoningDuration(undefined)
    },
    autoResume: true,
  })

  // Add minimal tab visibility management for stream resumption
  // (Thread component handles message loading)
  useTabVisibility({
    onVisible: () => {
      console.log("🔄 Chat became visible for thread:", threadId)
      // Only trigger resume check, don't refresh messages
      if (manualResume) {
        console.log("🔄 Checking for resumable streams...")
        manualResume()
      }
    },
    refreshStoresOnVisible: false, // Don't refresh stores here, Thread handles it
  })

  // Add a ref to always access the latest messages
  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Buffer for reasoning content if no assistant message is found
  const reasoningBufferRef = useRef<{reasoning: string, duration?: number, pending: boolean}>({reasoning: '', duration: undefined, pending: false})

  useReasoningStream({
    onReasoningStart: () => {
      console.log('[REASONING-STREAM-DEBUG] onReasoningStart called')
      setIsStreamingReasoning(true)
      setStreamingReasoning("")
      setReasoningDuration(undefined)
      setStreamingReasoningMessageId(null)
    },
    onReasoningDelta: (content: string) => {
      const newReasoning = streamingReasoning + content
      setStreamingReasoning(newReasoning)
      
      if (streamingReasoningMessageId) {
        console.log('[REASONING-STREAM-DEBUG] setMessages (delta):', {
          messageId: streamingReasoningMessageId,
          contentLength: content.length,
          totalReasoningLength: newReasoning.length
        })
        setMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg => 
            msg.id === streamingReasoningMessageId 
              ? {
                  ...msg,
                  parts: msg.parts?.map(part => 
                    part.type === "reasoning" 
                      ? { ...part, reasoning: newReasoning } as any
                      : part
                  ) || [{ type: "reasoning", reasoning: newReasoning } as any]
                }
              : msg
          )
          console.log('[REASONING-STREAM-DEBUG] Updated messages (delta):', updatedMessages.find(m => m.id === streamingReasoningMessageId))
          return updatedMessages
        })
      } else {
        // Try to find the latest assistant message and attach reasoning using the ref
        const currentMessages = messagesRef.current
        if (currentMessages.length > 0) {
          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage.role === "assistant") {
            console.log('[REASONING-STREAM-DEBUG] No message ID, attaching reasoning to latest assistant (ref):', lastMessage.id)
            setStreamingReasoningMessageId(lastMessage.id)
            setMessages(prevMessages => {
              const updatedMessages = prevMessages.map(msg =>
                msg.id === lastMessage.id
                  ? {
                      ...msg,
                      parts: [
                        { type: "reasoning", reasoning: newReasoning } as any,
                        ...(msg.parts || [])
                      ]
                    }
                  : msg
              )
              console.log('[REASONING-STREAM-DEBUG] Updated messages (delta, fallback, ref):', updatedMessages.find(m => m.id === lastMessage.id))
              return updatedMessages
            })
            reasoningBufferRef.current = {reasoning: '', pending: false}
          } else {
            // Buffer the reasoning and mark as pending
            reasoningBufferRef.current = {reasoning: newReasoning, pending: true}
            console.log('[REASONING-STREAM-DEBUG] No assistant message found (delta, ref). Buffering reasoning:', newReasoning.substring(0, 100))
          }
        } else {
          reasoningBufferRef.current = {reasoning: newReasoning, pending: true}
          console.log('[REASONING-STREAM-DEBUG] No messages yet, buffering reasoning content (delta, ref):', newReasoning.substring(0, 100))
        }
      }
    },
    onReasoningEnd: (duration: number, totalReasoning: string) => {
      setIsStreamingReasoning(false)
      setReasoningDuration(duration)
      setStreamingReasoning(totalReasoning)
      
      if (streamingReasoningMessageId) {
        console.log('[REASONING-STREAM-DEBUG] setMessages (end):', {
          messageId: streamingReasoningMessageId,
          reasoningLength: totalReasoning.length
        })
        setMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg => 
            msg.id === streamingReasoningMessageId 
              ? {
                  ...msg,
                  reasoning: totalReasoning, // Also set the top-level reasoning field
                  parts: msg.parts?.map(part => 
                    part.type === "reasoning" 
                      ? { ...part, reasoning: totalReasoning } as any
                      : part
                  ) || [{ type: "reasoning", reasoning: totalReasoning } as any]
                }
              : msg
          )
          console.log('[REASONING-STREAM-DEBUG] Updated messages (end):', updatedMessages.find(m => m.id === streamingReasoningMessageId))
          return updatedMessages
        })
      } else {
        // Try to find the latest assistant message and attach reasoning using the ref
        const currentMessages = messagesRef.current
        if (currentMessages.length > 0) {
          const lastMessage = currentMessages[currentMessages.length - 1]
          if (lastMessage.role === "assistant") {
            console.log('[REASONING-STREAM-DEBUG] No message ID, attaching final reasoning to latest assistant (ref):', lastMessage.id)
            setStreamingReasoningMessageId(lastMessage.id)
            setMessages(prevMessages => {
              const updatedMessages = prevMessages.map(msg =>
                msg.id === lastMessage.id
                  ? {
                      ...msg,
                      reasoning: totalReasoning,
                      parts: [
                        { type: "reasoning", reasoning: totalReasoning } as any,
                        ...(msg.parts || [])
                      ]
                    }
                  : msg
              )
              console.log('[REASONING-STREAM-DEBUG] Updated messages (end, fallback, ref):', updatedMessages.find(m => m.id === lastMessage.id))
              return updatedMessages
            })
            reasoningBufferRef.current = {reasoning: '', duration, pending: false}
          } else {
            // Buffer the reasoning and mark as pending
            reasoningBufferRef.current = {reasoning: totalReasoning, duration, pending: true}
            console.log('[REASONING-STREAM-DEBUG] No assistant message found (end, ref). Buffering final reasoning:', totalReasoning.substring(0, 100))
          }
        } else {
          reasoningBufferRef.current = {reasoning: totalReasoning, duration, pending: true}
          console.log('[REASONING-STREAM-DEBUG] No messages yet, buffering reasoning content (end, ref):', totalReasoning.substring(0, 100))
        }
      }
    },
  })

  // Effect to attach buffered reasoning as soon as an assistant message appears
  useEffect(() => {
    if (reasoningBufferRef.current.pending && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        console.log('[REASONING-STREAM-DEBUG] Attaching buffered reasoning to new assistant message:', lastMessage.id)
        setStreamingReasoningMessageId(lastMessage.id)
        setMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg =>
            msg.id === lastMessage.id
              ? {
                  ...msg,
                  reasoning: reasoningBufferRef.current.reasoning,
                  parts: [
                    { type: "reasoning", reasoning: reasoningBufferRef.current.reasoning } as any,
                    ...(msg.parts || [])
                  ]
                }
              : msg
          )
          console.log('[REASONING-STREAM-DEBUG] Updated messages (buffered attach):', updatedMessages.find(m => m.id === lastMessage.id))
          return updatedMessages
        })
        reasoningBufferRef.current = {reasoning: '', pending: false}
      } else {
        console.log('[REASONING-STREAM-DEBUG] New message is not assistant, not attaching buffered reasoning.')
      }
    }
  }, [messages])

  // Watch for new assistant messages and attach reasoning IMMEDIATELY for thinking models
  useEffect(() => {
    console.log("🧠 Message tracking effect triggered:", {
      messagesLength: messages.length,
      isStreamingReasoning,
      streamingReasoningMessageId,
      supportsThinking,
      status
    })
    
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      console.log("🧠 Last message:", {
        id: lastMessage.id,
        role: lastMessage.role,
        hasContent: !!lastMessage.content,
        contentLength: lastMessage.content?.length || 0,
        hasParts: !!lastMessage.parts,
        partsCount: lastMessage.parts?.length || 0,
        partsTypes: lastMessage.parts?.map(p => p.type) || []
      })
      
      if (lastMessage.role === "assistant") {
        // For reasoning models that send events, attach reasoning when streaming starts
        if (isStreamingReasoning && !streamingReasoningMessageId) {
          console.log("🧠 Found new assistant message, attaching reasoning:", lastMessage.id)
          setStreamingReasoningMessageId(lastMessage.id)
          
          // Only add reasoning part if it doesn't already exist
          if (!lastMessage.parts?.some(part => part.type === "reasoning")) {
            console.log("🧠 Adding reasoning part to message immediately")
            setMessages(prevMessages => {
              const updatedMessages = prevMessages.map(msg => 
                msg.id === lastMessage.id 
                  ? {
                      ...msg,
                      parts: [
                        { type: "reasoning", reasoning: streamingReasoning || "Thinking..." } as any,
                        ...(msg.parts || [])
                      ]
                    }
                  : msg
              )
              console.log("🧠 Message updated with reasoning part")
              return updatedMessages
            })
          } else {
            console.log("🧠 Reasoning part already exists, skipping duplicate")
          }
        }
        // For ALL thinking models, ensure reasoning component appears IMMEDIATELY when message is created
        else if (supportsThinking && (status === "streaming" || status === "submitted") && !lastMessage.parts?.some(part => part.type === "reasoning")) {
          console.log("🧠 Adding reasoning placeholder for thinking model IMMEDIATELY:", lastMessage.id)
          setMessages(prevMessages => {
            const updatedMessages = prevMessages.map(msg => 
              msg.id === lastMessage.id 
                ? {
                    ...msg,
                    parts: [
                      { type: "reasoning", reasoning: "Thinking..." } as any,
                      ...(msg.parts || [])
                    ]
                  }
                : msg
            )
            console.log("🧠 Message updated with reasoning placeholder")
            return updatedMessages
          })
        } else {
          console.log("🧠 No reasoning attachment needed:", {
            isStreamingReasoning,
            hasStreamingReasoningMessageId: !!streamingReasoningMessageId,
            supportsThinking,
            status,
            hasReasoningPart: lastMessage.parts?.some(part => part.type === "reasoning")
          })
        }
      }
    } else {
      console.log("🧠 No messages yet")
    }
  }, [messages, isStreamingReasoning, streamingReasoningMessageId, streamingReasoning, supportsThinking, status])

  // Clean up reasoning placeholders for thinking models when streaming completes
  useEffect(() => {
    if (supportsThinking && status !== "streaming" && status !== "submitted" && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        // Check if we have a reasoning placeholder that was never updated with real content
        const hasReasoningPlaceholder = lastMessage.parts?.some(part => 
          part.type === "reasoning" && (part as any).reasoning === "Thinking..."
        )
        
        if (hasReasoningPlaceholder && !lastMessage.reasoning) {
          console.log("🧠 Cleaning up reasoning placeholder for completed message:", lastMessage.id)
          // Remove the placeholder reasoning part if no actual reasoning was provided
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === lastMessage.id 
                ? {
                    ...msg,
                    parts: msg.parts?.filter(part => 
                      !(part.type === "reasoning" && (part as any).reasoning === "Thinking...")
                    ) || []
                  }
                : msg
            )
          )
        }
      }
    }
  }, [status, messages, supportsThinking])

  // Listen for workflow execution events
  useEffect(() => {
    const handleWorkflowMessage = async (event: Event) => {
      const customEvent = event as CustomEvent
      console.log("🔧 Received workflow message event:", customEvent.detail)
      
      if (customEvent.detail?.message && customEvent.detail?.executionData) {
        try {
          // Create a proper UIMessage for the workflow execution
          const workflowUserMessage: UIMessage = {
            id: uuidv4(),
            role: "user",
            content: customEvent.detail.message,
            createdAt: new Date(),
            parts: [{ type: "text", text: customEvent.detail.message }]
          }
          
          console.log("💾 Saving workflow user message to database:", workflowUserMessage.id)
          
          // Save the user message to the database first
          await createMessage(threadId, workflowUserMessage)
          console.log("✅ Workflow user message saved to database")
          
          // Then send through the normal chat flow
          await append(workflowUserMessage)
          console.log("✅ Workflow message sent to chat API")
        } catch (error) {
          console.error("❌ Failed to handle workflow message:", error)
        }
      }
    }

    window.addEventListener('sendWorkflowMessage', handleWorkflowMessage)
    
    return () => {
      window.removeEventListener('sendWorkflowMessage', handleWorkflowMessage)
    }
  }, [append, threadId])

  // Debug logging
  useEffect(() => {
    console.log("🎯 Chat state:", {
      isResuming,
      resumeProgress,
      resumeComplete,
      resumedMessageId,
      messagesCount: messages.length,
      supportsThinking,
      selectedModel,
    })
  }, [isResuming, resumeProgress, resumeComplete, resumedMessageId, messages.length, supportsThinking, selectedModel])

  // Handle thinking state during streaming
  useEffect(() => {
    if (status === "streaming" && supportsThinking) {
      const lastMessage = messages[messages.length - 1]

      // Show thinking indicator if:
      // 1. We're streaming
      // 2. It's an assistant message
      // 3. The content is empty or only contains thinking tags
      if (lastMessage?.role === "assistant") {
        const content = lastMessage.content || ""
        const hasVisibleContent = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim().length > 0

        setIsThinking(!hasVisibleContent)
      } else {
        setIsThinking(false)
      }
    } else {
      setIsThinking(false)
    }
  }, [status, messages, supportsThinking])

  // Add this effect to handle real-time thinking extraction
  useEffect(() => {
    console.log("🧠 Real-time thinking effect triggered:", {
      status,
      supportsThinking,
      messagesLength: messages.length,
      isResuming,
      selectedModel,
    })

    // Check if we're actively generating (streaming, submitted, or has thinking content)
    const isGenerating =
      status === "streaming" ||
      status === "submitted" ||
      (messages.length > 0 &&
        messages[messages.length - 1]?.role === "assistant" &&
        messages[messages.length - 1]?.content?.includes("<think>"))

    console.log("🧠 Generation check:", {
      status,
      isGenerating,
      hasMessages: messages.length > 0,
      lastMessageRole: messages.length > 0 ? messages[messages.length - 1]?.role : "none",
    })

    if (isGenerating && supportsThinking) {
      const lastMessage = messages[messages.length - 1]

      if (lastMessage?.role === "assistant") {
        // Store the current message ID for reference
        currentMessageIdRef.current = lastMessage.id

        // Check if the message contains thinking tags
        const content = lastMessage.content || ""
        console.log("🧠 Checking content for thinking tags:", {
          contentLength: content.length,
          hasThinkStart: content.includes("<think>"),
          hasThinkEnd: content.includes("</think>"),
          contentPreview: content.substring(0, 200),
        })

        // Show thinking indicator as soon as we see <think> tag, even without closing tag
        if (content.includes("<think>")) {
          console.log("🧠 Think tag detected, showing realtime thinking")
          setShowRealtimeThinking(true)

          // Extract thinking content - handle both complete and partial thinking blocks
          if (content.includes("</think>")) {
            // Complete thinking blocks
            const thinkMatches = content.match(/<think>([\s\S]*?)<\/think>/g)
            if (thinkMatches) {
              let allThinking = ""
              thinkMatches.forEach((match) => {
                const thinkContent = match.replace(/<think>|<\/think>/g, "")
                allThinking += thinkContent + "\n"
              })

              console.log("🧠 Extracted complete thinking content:", {
                matchesCount: thinkMatches.length,
                thinkingLength: allThinking.length,
                thinkingPreview: allThinking.substring(0, 100),
              })

              setRealtimeThinking(allThinking)
            }
          } else {
            // Partial thinking block (streaming in progress)
            const partialMatch = content.match(/<think>([\s\S]*)$/)
            if (partialMatch) {
              const partialThinking = partialMatch[1]
              console.log("🧠 Extracted partial thinking content:", {
                thinkingLength: partialThinking.length,
                thinkingPreview: partialThinking.substring(0, 100),
              })
              setRealtimeThinking(partialThinking)
            }
          }
        } else if (content.length > 0) {
          console.log("🧠 Content found but no thinking tags detected")
        }
      }
    } else {
      // Reset thinking when not streaming
      if (!isResuming && status !== "streaming") {
        console.log("🧠 Resetting thinking state")
        setShowRealtimeThinking(false)
        setRealtimeThinking("")
        currentMessageIdRef.current = null
      }
    }
  }, [messages, status, supportsThinking, isResuming, selectedModel])

  const scrollToBottom = () => {
    isAutoScrolling.current = true
    
    // Hide the button immediately when clicked
    setShowScrollToBottom(false)
    
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    })
    
    setTimeout(() => {
      isAutoScrolling.current = false
      // Double-check if we're at bottom after scroll completes
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const isNearBottom = documentHeight - (scrollTop + windowHeight) < 100
      setShowScrollToBottom(!isNearBottom)
    }, 1000)
  }

  const handleScroll = () => {
    if (isAutoScrolling.current) return

    // Track when user manually scrolls
    lastUserScrollTime.current = Date.now()
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    const isNearBottom = documentHeight - (scrollTop + windowHeight) < 100
    setShowScrollToBottom(!isNearBottom)
    
    // More responsive auto-scroll control during streaming
    if (status === "streaming") {
      // If user scrolls significantly away from bottom, disable auto-scroll
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight)
      if (distanceFromBottom > 500) {
        autoScrollEnabled.current = false
      } else if (distanceFromBottom < 100) {
        // Re-enable if user scrolls close to bottom
        autoScrollEnabled.current = true
      }
    } else if (isNearBottom) {
      autoScrollEnabled.current = true
    }
  }

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Auto-scroll during streaming or resuming
  useEffect(() => {
    if ((status === "streaming" || isResuming) && messages.length > 0) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const isNearBottom = documentHeight - (scrollTop + windowHeight) < 300

      // Only auto-scroll if user hasn't manually scrolled recently and auto-scroll is enabled
      const timeSinceUserScroll = Date.now() - lastUserScrollTime.current
      const shouldAutoScroll = autoScrollEnabled.current && (timeSinceUserScroll > 1000 || isNearBottom)

      if (shouldAutoScroll) {
        setTimeout(() => scrollToBottom(), 100)
      }
    }
  }, [messages.length, status, isResuming])

  // Enhanced auto-scroll for streaming content updates
  useEffect(() => {
    if (status === "streaming" && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      
      // Only auto-scroll if it's an assistant message being streamed and auto-scroll is enabled
      if (lastMessage?.role === "assistant" && autoScrollEnabled.current) {
        // Use requestAnimationFrame for smoother scrolling during rapid updates
        requestAnimationFrame(() => {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth",
          })
        })
      }
    }
  }, [messages, status])

  // Reset auto-scroll when streaming starts
  useEffect(() => {
    if (status === "streaming") {
      autoScrollEnabled.current = true
    }
  }, [status])

  // Handle keyboard shortcuts
  const handleClearInput = () => {
    setInput("")
  }

  const handleUndoMessage = () => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      setMessages(messages.slice(0, -1))
      if (lastMessage.role === "assistant") {
        reload()
      }
    }
  }

  const handleStopGenerating = () => {
    if (status === "streaming") {
      stop()
    }
  }

  const handleSubmit = useCallback(() => {
    // Implementation
  }, [])

  const handlePin = useCallback(() => {
    // Implementation
  }, [])

  const handleCopy = useCallback(() => {
    // Implementation
  }, [])

  const handleEdit = useCallback(() => {
    // Implementation
  }, [])

  const handlePromptClick = useCallback(
    async (prompt: string) => {
      console.log("🎯 handlePromptClick called with prompt:", prompt)
      try {
        // Set the prompt as the input and append it as a user message
        setInput("")
        const messageId = uuidv4()
        const message = {
          id: messageId,
          role: "user" as const,
          content: prompt,
          createdAt: new Date(),
          parts: [{ type: "text" as const, text: prompt }],
        }

        console.log("💬 Created message:", message)

        // Create thread if needed
        if (!id) {
          console.log("📝 Creating new thread...")
          navigate(`/chat/${threadId}`)
          await createThread(threadId)
          console.log("✅ Thread created successfully")
        }

        // Save to database first
        console.log("💾 Saving message to database...")
        await createMessage(threadId, message)
        console.log("✅ Message saved to database")

        // Then append to chat
        console.log("📤 Appending message to chat...")
        await append(message)
        console.log("✅ Message appended to chat")
      } catch (error) {
        console.error("❌ Error sending prompt:", error)
        toast.error("Failed to send message")
      }
    },
    [append, setInput, threadId, id, navigate, createMessage, createThread],
  )

  // Define keyboard shortcuts
  const shortcuts = useMemo(
    () => [
      {
        name: "Navigation",
        shortcuts: [
          {
            key: "n",
            modifiers: { meta: true, shift: true },
            description: "New conversation",
            handler: () => navigate("/chat"),
          },
          {
            key: "b",
            modifiers: { meta: true },
            description: "Toggle sidebar",
            handler: () => toggleSidebar(),
          },
          {
            key: "k",
            modifiers: { meta: true },
            description: "Search conversations",
            handler: () => {
              /* TODO: Implement search */
            },
          },
        ],
      },
      {
        name: "Conversation",
        shortcuts: [
          {
            key: "Enter",
            description: "Send message",
            handler: handleSubmit,
            allowInInput: true,
          },
          {
            key: "Enter",
            modifiers: { meta: true },
            description: "New line",
            handler: () => {
              /* Handled in ChatInput */
            },
            allowInInput: true,
          },
          {
            key: "Backspace",
            modifiers: { meta: true },
            description: "Clear input",
            handler: () => setInput(""),
          },
          {
            key: "z",
            modifiers: { meta: true },
            description: "Undo last message",
            handler: handleUndoMessage,
          },
          {
            key: "Escape",
            description: "Stop generating",
            handler: handleStopGenerating,
          },
        ],
      },
      {
        name: "Messages",
        shortcuts: [
          {
            key: "p",
            modifiers: { meta: true, shift: true },
            description: "Pin/unpin message",
            handler: handlePin,
          },
          {
            key: "c",
            modifiers: { meta: true },
            description: "Copy message",
            handler: handleCopy,
          },
          {
            key: "e",
            modifiers: { meta: true },
            description: "Edit message",
            handler: handleEdit,
          },
          {
            key: "t",
            modifiers: { meta: true },
            description: "Toggle thinking view",
            handler: () => {
              // This will be handled at the Message level
            },
          },
        ],
      },
    ],
    [navigate, toggleSidebar, handleSubmit, setInput, threadId, id],
  )

  // Use the keyboard shortcut manager
  useKeyboardShortcutManager(shortcuts)

  // Add state for tracking artifact creation
  const [artifactsCreated, setArtifactsCreated] = useState(0)
  const [showArtifactIndicator, setShowArtifactIndicator] = useState(false)
  const lastProcessedMessageRef = useRef<string | null>(null)

  // Improved artifact detection - check when messages change and status becomes ready
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      
      // Only process if this is a new assistant message we haven't processed yet
      if (
        lastMessage?.role === "assistant" && 
        lastMessage.content && 
        lastMessage.id !== lastProcessedMessageRef.current
      ) {
        console.log("🎨 Checking for artifacts in message:", lastMessage.id)
        
        const content = lastMessage.content
        let artifactCount = 0
        
        // Count code blocks (more than 3 lines or 100 characters)
        const codeBlocks = content.match(/\`\`\`[\w]*\n([\s\S]*?)\`\`\`/g) || []
        const substantialCodeBlocks = codeBlocks.filter(block => {
          const codeContent = block.replace(/\`\`\`[\w]*\n|\`\`\`/g, '').trim()
          return codeContent.split('\n').length > 3 || codeContent.length > 100
        })
        artifactCount += substantialCodeBlocks.length
        
        // Check for structured documents (markdown with headers and substantial content)
        const hasHeaders = content.includes("# ") || content.includes("## ") || content.includes("### ")
        const hasStructuredContent = content.includes("- ") || content.includes("1. ") || content.includes("| ")
        const isSubstantial = content.length > 500
        
        if (hasHeaders && hasStructuredContent && isSubstantial) {
          artifactCount += 1
        }
        
        // Check for JSON/YAML data structures
        const jsonBlocks = content.match(/\`\`\`json\n([\s\S]*?)\`\`\`/g) || []
        const yamlBlocks = content.match(/\`\`\`ya?ml\n([\s\S]*?)\`\`\`/g) || []
        const substantialDataBlocks = [...jsonBlocks, ...yamlBlocks].filter(block => {
          const dataContent = block.replace(/\`\`\`[\w]*\n|\`\`\`/g, '').trim()
          return dataContent.length > 50
        })
        artifactCount += substantialDataBlocks.length
        
        console.log("🎨 Artifact detection results:", {
          messageId: lastMessage.id,
          codeBlocks: substantialCodeBlocks.length,
          hasStructuredDoc: hasHeaders && hasStructuredContent && isSubstantial ? 1 : 0,
          dataBlocks: substantialDataBlocks.length,
          totalArtifacts: artifactCount
        })
        
        if (artifactCount > 0) {
          console.log(`🎨 Found ${artifactCount} artifacts, showing indicator`)
          setArtifactsCreated(artifactCount)
          setShowArtifactIndicator(true)
          
          // Hide indicator after 5 seconds
          setTimeout(() => {
            setShowArtifactIndicator(false)
            setArtifactsCreated(0)
          }, 5000)
        }
        
        // Mark this message as processed
        lastProcessedMessageRef.current = lastMessage.id
      }
    }
  }, [status, messages])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please log in to use the chat</p>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <Button variant="outline" size="icon" onClick={toggleSidebar} className="fixed top-4 left-4 z-50 md:hidden">
        <ChevronDown className="h-4 w-4" />
      </Button>

      {/* Global Resuming Indicator */}
      <GlobalResumingIndicator isResuming={isResuming} resumeProgress={resumeProgress} threadTitle="Current Chat" />

      {/* Pinned Messages Panel */}
      {showPinnedMessages && (
        <div className="fixed top-16 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] max-h-96 bg-background border rounded-lg shadow-lg">
          <PinnedMessages threadId={threadId} onClose={() => setShowPinnedMessages(false)} />
        </div>
      )}

      <main className="flex flex-col w-full max-w-3xl pt-10 pb-48 mx-auto transition-all duration-300 ease-in-out px-4 sm:px-6 lg:px-8">

        <RegenerationProvider
          onMessageUpdate={(updatedMessage) => {
            console.log("🔄 Updating message with new attempts:", updatedMessage.id, "Total attempts:", updatedMessage.attempts?.length)
            setMessages((prevMessages) => {
              return prevMessages.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage as UIMessage : msg
              )
            })
          }}
        >
          <Messages
            threadId={threadId}
            messages={messages}
            status={status}
            setMessages={setMessages as any}
            reload={reload}
            error={error}
            registerRef={registerRef || (() => {})}
            stop={stop}
            resumeComplete={resumeComplete}
            resumedMessageId={resumedMessageId}
            onPromptClick={handlePromptClick}
          />
        </RegenerationProvider>
        <ChatInput threadId={threadId} input={input} status={status} append={append} setInput={setInput} stop={stop} onRefreshMessages={onRefreshMessages} />
      </main>

      {showScrollToBottom && (
        <div className={cn(
          "fixed w-full max-w-4xl bottom-[220px] z-50",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "px-3 md:px-4 pointer-events-none",
          isMobile
            ? "left-1/2 transform -translate-x-1/2"
            : sidebarCollapsed
              ? "left-1/2 transform -translate-x-1/2"
              : "left-[calc(var(--sidebar-width)+1rem)] right-4 transform-none max-w-none w-[calc(100vw-var(--sidebar-width)-2rem)]",
        )}>
          <div className="flex justify-center">
            <Button
              onClick={scrollToBottom}
              variant="secondary"
              size="sm"
              className="gap-2 shadow-sm bg-muted/80 text-muted-foreground hover:bg-muted border border-border/50 pointer-events-auto"
              aria-label="Scroll to bottom"
            >
              <ChevronDown className="h-3 w-3" />
              Go to bottom
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
