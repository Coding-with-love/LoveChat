"use client"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import Messages from "./Messages"
import ChatInput from "./ChatInput"
import type { UIMessage } from "ai"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useSidebar } from "./ui/sidebar"
import { Button } from "./ui/button"
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
import { ThinkingIndicator } from "./ThinkingIndicator"
import type { Message, CreateMessage } from "ai"
import { getMessageParts } from "@ai-sdk/ui-utils"
import { useTabVisibility } from "@/frontend/hooks/useTabVisibility"
import RealtimeThinking from "./RealTimeThinking"
import { useUserPreferencesStore } from "@/frontend/stores/UserPreferencesStore"

// Extend UIMessage to include reasoning field
interface ExtendedUIMessage extends UIMessage {
  reasoning?: string
  model?: string
}

interface ChatProps {
  threadId: string
  initialMessages: UIMessage[]
  registerRef?: (id: string, ref: HTMLDivElement | null) => void
}

export default function Chat({ threadId, initialMessages, registerRef }: ChatProps) {
  const { getKey } = useAPIKeyStore()
  const selectedModel = useModelStore((state) => state.selectedModel)
  const modelConfig = useMemo(() => getModelConfig(selectedModel), [selectedModel])

  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const isAutoScrolling = useRef(false)

  // Add these state variables inside the Chat component function
  const [realtimeThinking, setRealtimeThinking] = useState("")
  const [showRealtimeThinking, setShowRealtimeThinking] = useState(false)
  const currentMessageIdRef = useRef<string | null>(null)

  const navigate = useNavigate()
  const { toggleSidebar } = useSidebar()
  const { id } = useParams()

  // Get user preferences for chat
  const userPreferences = useUserPreferencesStore()

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

      const uiMessage: ExtendedUIMessage = {
        id: message.id || crypto.randomUUID(),
        role: message.role,
        content: message.content || "",
        createdAt: message.createdAt || new Date(),
        parts: parts as UIMessage["parts"],
        model: selectedModel,
        reasoning: reasoning,
      }
      return uiMessage
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
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    })
    setTimeout(() => {
      isAutoScrolling.current = false
    }, 1000)
  }

  const handleScroll = () => {
    if (isAutoScrolling.current) return

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    const isNearBottom = documentHeight - (scrollTop + windowHeight) < 200
    setShowScrollToBottom(!isNearBottom)
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

      if (isNearBottom) {
        setTimeout(() => scrollToBottom(), 100)
      }
    }
  }, [messages.length, status, isResuming])

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

        // Create thread if needed
        if (!id) {
          console.log("📝 Creating new thread...")
          navigate(`/chat/${threadId}`)
          await createThread(threadId)
          console.log("✅ Thread created successfully")
        }

        // Save to database first
        await createMessage(threadId, message)

        // Then append to chat
        await append(message)
      } catch (error) {
        console.error("Error sending prompt:", error)
        toast.error("Failed to send message")
      }
    },
    [append, setInput, threadId, id, navigate],
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

// Remove the old artifact detection useEffect that was conflicting

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

      {showRealtimeThinking && supportsThinking && (
        <div className="fixed top-20 right-4 z-50 w-80 max-h-[70vh] overflow-auto bg-white dark:bg-gray-900 border-2 border-purple-500 rounded-lg shadow-lg">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-bold">
            REALTIME THINKING VISIBLE
          </div>
          <RealtimeThinking
            isVisible={showRealtimeThinking}
            thinkingContent={realtimeThinking}
            messageId={currentMessageIdRef.current || "thinking"}
          />
        </div>
      )}

      {/* Pinned Messages Panel */}
      {showPinnedMessages && (
        <div className="fixed top-16 right-4 z-40 w-80 max-h-96 bg-background border rounded-lg shadow-lg">
          <PinnedMessages threadId={threadId} onClose={() => setShowPinnedMessages(false)} />
        </div>
      )}

      <main className="flex flex-col w-full max-w-3xl pt-10 pb-56 mx-auto transition-all duration-300 ease-in-out">
        {/* Global Thinking Indicator - shown when streaming starts with thinking models */}
        {isThinking && status === "streaming" && supportsThinking && (
          <div className="mb-6 flex justify-center">
            <ThinkingIndicator isVisible={true} />
          </div>
        )}

        <Messages
          threadId={threadId}
          messages={messages}
          status={status}
          setMessages={setMessages}
          reload={reload}
          error={error}
          registerRef={registerRef || (() => {})}
          stop={stop}
          resumeComplete={resumeComplete}
          resumedMessageId={resumedMessageId}
          onPromptClick={handlePromptClick}
        />
        <ChatInput threadId={threadId} input={input} status={status} append={append} setInput={setInput} stop={stop} />
      </main>

      {showScrollToBottom && (
        <Button
          onClick={scrollToBottom}
          variant="outline"
          size="icon"
          className="fixed right-4 bottom-32 z-20 shadow-lg bg-background/95 backdrop-blur-sm hover:bg-background border-2"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
