"use client"

import { memo, useState } from "react"
import Message from "./Message"
import type { UIMessage } from "ai"
import type { UseChatHelpers } from "@ai-sdk/react"
import MessageLoading from "./ui/MessageLoading"
import Error from "./Error"
import ChatLandingPage from "./ChatLandingPage"
import { useAuth } from "@/frontend/components/AuthProvider"
import { getModelConfig } from "@/lib/models"

// Extend UIMessage to include reasoning field
interface ExtendedUIMessage extends UIMessage {
  reasoning?: string
  model?: string
}

function PureMessages({
  threadId,
  messages,
  status,
  setMessages,
  reload,
  error,
  stop,
  registerRef,
  resumeComplete,
  resumedMessageId,
  onPromptClick,
}: {
  threadId: string
  messages: ExtendedUIMessage[]
  setMessages: UseChatHelpers["setMessages"]
  reload: UseChatHelpers["reload"]
  status: UseChatHelpers["status"]
  error: UseChatHelpers["error"]
  stop: UseChatHelpers["stop"]
  registerRef: (id: string, ref: HTMLDivElement | null) => void
  resumeComplete?: boolean
  resumedMessageId?: string | null
  onPromptClick?: (prompt: string) => void
}) {
  // State to manage thinking visibility for each message
  const [showThinking, setShowThinking] = useState<Record<string, boolean>>(() =>
    messages.reduce((acc: Record<string, boolean>, message) => {
      acc[message.id] = false
      return acc
    }, {}),
  )
  const { profile } = useAuth()

  const toggleThinking = (messageId: string) => {
    setShowThinking((prev) => {
      const newState = { ...prev }
      newState[messageId] = !newState[messageId]
      return newState
    })
  }

  // Check if the current model supports thinking
  const isThinkingModel = (modelName: string) => {
    try {
      const config = getModelConfig(modelName as any)
      return config.supportsThinking || false
    } catch {
      return modelName?.includes("o1") || modelName?.includes("thinking") || false
    }
  }

  // Show landing page when there are no messages and not loading
  if (messages.length === 0 && status !== "submitted" && !error) {
    return (
      <ChatLandingPage
        onPromptClick={onPromptClick || (() => {})}
        userName={profile?.full_name || profile?.username || ""}
      />
    )
  }

  return (
    <section className="flex flex-col space-y-12">
      {messages.map((message, index) => (
        <Message
          key={message.id}
          threadId={threadId}
          message={message}
          isStreaming={status === "streaming" && messages.length - 1 === index}
          setMessages={setMessages}
          reload={reload}
          registerRef={registerRef}
          stop={stop}
          resumeComplete={resumeComplete}
          resumedMessageId={resumedMessageId}
          showThinking={showThinking[message.id] || false}
          toggleThinking={() => toggleThinking(message.id)}
          isThinkingModel={isThinkingModel(message.model || "")}
        />
      ))}
      {status === "submitted" && <MessageLoading />}
      {error && <Error message={error.message} />}
    </section>
  )
}

const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false
  if (prevProps.error !== nextProps.error) return false
  if (prevProps.messages.length !== nextProps.messages.length) return false
  if (prevProps.resumeComplete !== nextProps.resumeComplete) return false
  if (prevProps.resumedMessageId !== nextProps.resumedMessageId) return false

  // Custom comparison to account for reasoning
  if (prevProps.messages.length === nextProps.messages.length) {
    for (let i = 0; i < prevProps.messages.length; i++) {
      const prevMessage = prevProps.messages[i]
      const nextMessage = nextProps.messages[i]

      if (
        prevMessage.id !== nextMessage.id ||
        prevMessage.content !== nextMessage.content ||
        prevMessage.role !== nextMessage.role ||
        prevMessage.reasoning !== nextMessage.reasoning
      ) {
        return false
      }
    }
  }

  return true
})

Messages.displayName = "Messages"

export default Messages
