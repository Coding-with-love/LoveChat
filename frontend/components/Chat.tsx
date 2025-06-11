"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import Messages from "./Messages"
import ChatInput from "./ChatInput"
import type { UIMessage } from "ai"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { SidebarTrigger, useSidebar } from "./ui/sidebar"
import { Button } from "./ui/button"
import { ChevronDown, RotateCcw, Pin } from "lucide-react"
import { useCustomResumableChat } from "@/frontend/hooks/useCustomResumableChat"
import { getModelConfig } from "@/lib/models"
import { GlobalResumingIndicator } from "./ResumingIndicator"
import { PinnedMessages } from "./PinnedMessages"
import { useKeyboardShortcuts } from "@/frontend/hooks/useKeyboardShortcuts"
import type { Message, CreateMessage, ChatRequestOptions } from "ai"
import { getMessageParts } from "@ai-sdk/ui-utils"
import { useKeyboardShortcutManager } from "@/frontend/hooks/useKeyboardShortcutManager"
import { useNavigate, useParams } from "react-router"
import { createMessage, createThread } from "@/lib/supabase/queries"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"

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
  const isAutoScrolling = useRef(false)

  const navigate = useNavigate()
  const { toggleSidebar } = useSidebar()
  const { id } = useParams()

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
    onFinish: (message: Message | CreateMessage) => {
      console.log("🏁 Chat stream finished:", message.id)
      const parts = message.parts ?? getMessageParts(message) ?? [{ type: 'text' as const, text: message.content || '' }]
      const uiMessage: UIMessage = {
        id: message.id || crypto.randomUUID(),
        role: message.role,
        content: message.content || "",
        createdAt: message.createdAt || new Date(),
        parts: parts as UIMessage["parts"],
      }
      return uiMessage
    },
    autoResume: true,
  })

  // Debug logging
  useEffect(() => {
    console.log("🎯 Chat state:", {
      isResuming,
      resumeProgress,
      resumeComplete,
      resumedMessageId,
      messagesCount: messages.length,
    })
  }, [isResuming, resumeProgress, resumeComplete, resumedMessageId, messages.length])

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

  const handlePromptClick = useCallback(async (prompt: string) => {
    try {
      // Set the prompt as the input and append it as a user message
      setInput("")
      const messageId = uuidv4()
      const message = {
        id: messageId,
        role: "user" as const,
        content: prompt,
        createdAt: new Date(),
        parts: [{ type: 'text' as const, text: prompt }]
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
  }, [append, setInput, threadId, id, navigate])

  // Define keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      name: "Navigation",
      shortcuts: [
        {
          key: "n",
          modifiers: { meta: true, shift: true },
          description: "New conversation",
          handler: () => navigate("/chat")
        },
        {
          key: "b",
          modifiers: { meta: true },
          description: "Toggle sidebar",
          handler: () => toggleSidebar()
        },
        {
          key: "k",
          modifiers: { meta: true },
          description: "Search conversations",
          handler: () => {/* TODO: Implement search */}
        }
      ]
    },
    {
      name: "Conversation",
      shortcuts: [
        {
          key: "Enter",
          description: "Send message",
          handler: handleSubmit,
          allowInInput: true
        },
        {
          key: "Enter",
          modifiers: { meta: true },
          description: "New line",
          handler: () => {/* Handled in ChatInput */},
          allowInInput: true
        },
        {
          key: "Backspace",
          modifiers: { meta: true },
          description: "Clear input",
          handler: () => setInput("")
        },
        {
          key: "z",
          modifiers: { meta: true },
          description: "Undo last message",
          handler: handleUndoMessage
        },
        {
          key: "Escape",
          description: "Stop generating",
          handler: handleStopGenerating
        }
      ]
    },
    {
      name: "Messages",
      shortcuts: [
        {
          key: "p",
          modifiers: { meta: true, shift: true },
          description: "Pin/unpin message",
          handler: handlePin
        },
        {
          key: "c",
          modifiers: { meta: true },
          description: "Copy message",
          handler: handleCopy
        },
        {
          key: "e",
          modifiers: { meta: true },
          description: "Edit message",
          handler: handleEdit
        }
      ]
    }
  ], [navigate, toggleSidebar, handleSubmit, setInput, handleUndoMessage, handleStopGenerating, handlePin, handleCopy, handleEdit])

  // Use the keyboard shortcut manager
  useKeyboardShortcutManager(shortcuts)

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please log in to use the chat</p>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <ChatSidebarTrigger />

      {/* Global Resuming Indicator */}
      <GlobalResumingIndicator isResuming={isResuming} resumeProgress={resumeProgress} threadTitle="Current Chat" />

      {/* Pinned Messages Panel */}
      {showPinnedMessages && (
        <div className="fixed top-16 right-4 z-40 w-80 max-h-96 bg-background border rounded-lg shadow-lg">
          <PinnedMessages threadId={threadId} onClose={() => setShowPinnedMessages(false)} />
        </div>
      )}

      <main className="flex flex-col w-full max-w-3xl pt-10 pb-56 mx-auto transition-all duration-300 ease-in-out">
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

const ChatSidebarTrigger = () => {
  const { state } = useSidebar()

  return <SidebarTrigger className={`fixed left-4 bottom-4 z-50 ${state === "expanded" ? "md:hidden" : ""}`} />
}
