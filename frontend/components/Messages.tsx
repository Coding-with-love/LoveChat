"use client"

import { memo, useState } from "react"
import Message from "./Message"
import type { UIMessage } from "ai"
import type { UseChatHelpers } from "@ai-sdk/react"
import equal from "fast-deep-equal"
import MessageLoading from "./ui/MessageLoading"
import Error from "./Error"
import ChatLandingPage from "./ChatLandingPage"
import { useAuth } from "@/frontend/components/AuthProvider"

// Extend UIMessage to include reasoning field
interface ExtendedUIMessage extends UIMessage {
  reasoning?: string
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
  const [showThinking, setShowThinking] = useState<Record<string, boolean>>({})
  const { profile } = useAuth()

  const toggleThinking = (messageId: string) => {
    setShowThinking((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }))
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
  if (!equal(prevProps.messages, nextProps.messages)) return false
  return true
})

Messages.displayName = "Messages"

export default Messages
