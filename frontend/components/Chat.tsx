"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import Messages from "./Messages"
import ChatInput from "./ChatInput"
import type { UIMessage } from "ai"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { SidebarTrigger, useSidebar } from "./ui/sidebar"
import { Button } from "./ui/button"
import { ChevronDown } from "lucide-react"
import { useAuthenticatedChat } from "@/frontend/hooks/useAuthenticatedChat"
import { useStreamInterruption } from "@/frontend/hooks/useStreamInterruption"
import { getModelConfig } from "@/lib/models"
import { v4 as uuidv4 } from "uuid"

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
  const isAutoScrolling = useRef(false)
  const currentStreamId = useRef<string | null>(null)

  // Stream interruption detection
  const { registerStream, unregisterStream } = useStreamInterruption()

  // Enhanced useAuthenticatedChat with stream tracking
  const { messages, input, status, setInput, setMessages, append, stop, reload, error, isAuthenticated } =
    useAuthenticatedChat({
      threadId,
      initialMessages,
      onFinish: (message) => {
        console.log("🏁 Chat stream finished, unregistering:", message.id)
        if (currentStreamId.current) {
          unregisterStream(currentStreamId.current)
          currentStreamId.current = null
        }
      },
    })

  // Enhanced append function that registers streams immediately
  const enhancedAppend = async (message: UIMessage) => {
    // Generate a predictable message ID for the AI response
    const aiMessageId = uuidv4()
    console.log("🚀 Starting new chat, registering stream immediately:", aiMessageId)

    // Register the stream before making the API call
    currentStreamId.current = aiMessageId
    registerStream(aiMessageId)

    try {
      await append(message)
    } catch (error) {
      console.error("Error in append:", error)
      // If append fails, unregister the stream
      if (currentStreamId.current) {
        unregisterStream(currentStreamId.current)
        currentStreamId.current = null
      }
      throw error
    }
  }

  const scrollToBottom = () => {
    isAutoScrolling.current = true
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    })
    // Reset auto-scrolling flag after animation completes
    setTimeout(() => {
      isAutoScrolling.current = false
    }, 1000)
  }

  const handleScroll = () => {
    if (isAutoScrolling.current) return

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    // Show button when user is more than 200px from bottom
    const isNearBottom = documentHeight - (scrollTop + windowHeight) < 200
    setShowScrollToBottom(!isNearBottom)
  }

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (status === "streaming" && messages.length > 0) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const isNearBottom = documentHeight - (scrollTop + windowHeight) < 300

      if (isNearBottom) {
        setTimeout(() => scrollToBottom(), 100)
      }
    }
  }, [messages.length, status])

  // Enhanced stop function that also unregisters the stream
  const handleStop = () => {
    console.log("🛑 Manually stopping chat stream")
    if (currentStreamId.current) {
      unregisterStream(currentStreamId.current)
      currentStreamId.current = null
    }
    stop()
  }

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Chat component unmounting, cleaning up active stream")
      if (currentStreamId.current) {
        unregisterStream(currentStreamId.current)
        currentStreamId.current = null
      }
    }
  }, [unregisterStream])

  // Track status changes to handle interruptions
  useEffect(() => {
    if (status === "error" && currentStreamId.current) {
      console.log("❌ Chat stream error, unregistering:", currentStreamId.current)
      unregisterStream(currentStreamId.current)
      currentStreamId.current = null
    }
  }, [status, unregisterStream])

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

      <main className={`flex flex-col w-full max-w-3xl pt-10 pb-56 mx-auto transition-all duration-300 ease-in-out`}>
        <Messages
          threadId={threadId}
          messages={messages}
          status={status}
          setMessages={setMessages}
          reload={reload}
          error={error}
          registerRef={registerRef || (() => {})}
          stop={handleStop}
        />
        <ChatInput
          threadId={threadId}
          input={input}
          status={status}
          append={enhancedAppend}
          setInput={setInput}
          stop={handleStop}
        />
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

  return <SidebarTrigger className={`fixed left-4 top-4 z-50 ${state === "expanded" ? "md:hidden" : ""}`} />
}
