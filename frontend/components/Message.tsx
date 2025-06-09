"use client"

import { memo, useState, useEffect, useRef, useCallback } from "react"
import MarkdownRenderer from "@/frontend/components/MemoizedMarkdown"
import { cn } from "@/lib/utils"
import type { UIMessage } from "ai"
import equal from "fast-deep-equal"
import MessageControls from "./MessageControls"
import type { UseChatHelpers } from "@ai-sdk/react"
import MessageEditor from "./MessageEditor"
import MessageReasoning from "./MessageReasoning"
import FileAttachmentViewer from "./FileAttachmentViewer"
import MessageSources from "./MessageSources"
import WebSearchBanner from "./WebSearchBanner"

function PureMessage({
  threadId,
  message,
  setMessages,
  reload,
  isStreaming,
  registerRef,
  stop,
  resumeComplete,
  resumedMessageId,
}: {
  threadId: string
  message: UIMessage
  setMessages: UseChatHelpers["setMessages"]
  reload: UseChatHelpers["reload"]
  isStreaming: boolean
  registerRef: (id: string, ref: HTMLDivElement | null) => void
  stop: UseChatHelpers["stop"]
  resumeComplete?: boolean
  resumedMessageId?: string | null
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [showAnimation, setShowAnimation] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)

  // Register this message's ref for navigation
  useEffect(() => {
    registerRef(message.id, messageRef.current)
    return () => registerRef(message.id, null)
  }, [message.id, registerRef])

  // Handle resume completion animation
  useEffect(() => {
    if (resumeComplete && resumedMessageId === message.id) {
      console.log("🎉 Triggering completion animation for message:", message.id)
      setShowAnimation(true)

      // Reset animation after duration
      const timer = setTimeout(() => {
        setShowAnimation(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [resumeComplete, resumedMessageId, message.id])

  // Extract file attachments from message parts
  const fileAttachments = message.parts?.find((part) => part.type === "file_attachments")?.attachments || []

  // Extract sources if available
  const sources = message.parts?.find((part) => part.type === "sources")?.sources || []

  // Check if this message used web search
  const usedWebSearch = sources.length > 0

  // Filter out tool calls and other non-user-facing parts
  const displayParts =
    message.parts?.filter((part) => {
      if (message.role === "user") {
        return part.type === "text" || part.type === "reasoning"
      }
      return part.type === "text" || part.type === "reasoning"
    }) || []

  // Handle code conversion - use useCallback to prevent unnecessary re-renders
  const handleCodeConvert = useCallback(
    (originalCode: string, convertedCode: string, target: string) => {
      console.log("🔄 Code converted in Message component:", {
        messageId: message.id,
        target,
        originalLength: originalCode.length,
        convertedLength: convertedCode.length,
      })
      // The actual saving is handled in the MemoizedMarkdown component
      // We don't need to do anything here to update the UI
    },
    [message.id],
  )

  return (
    <div
      ref={messageRef}
      role="article"
      className={cn(
        "flex flex-col transition-all duration-500",
        message.role === "user" ? "items-end" : "items-start",
        showAnimation && "animate-pulse",
      )}
      data-message-id={message.id}
    >
      {/* Web Search Banner for Assistant Messages */}
      {message.role === "assistant" && usedWebSearch && <WebSearchBanner />}

      {displayParts.map((part, index) => {
        const { type } = part
        const key = `message-${message.id}-part-${index}`

        if (type === "reasoning") {
          return <MessageReasoning key={key} reasoning={part.reasoning} id={message.id} />
        }

        if (type === "text") {
          return message.role === "user" ? (
            <div
              key={key}
              className="relative group px-4 py-3 rounded-xl bg-secondary border border-secondary-foreground/2 max-w-[80%]"
            >
              {mode === "edit" && (
                <MessageEditor
                  threadId={threadId}
                  message={message}
                  content={part.text}
                  setMessages={setMessages}
                  reload={reload}
                  setMode={setMode}
                  stop={stop}
                />
              )}
              {mode === "view" && <p>{part.text}</p>}

              {mode === "view" && (
                <MessageControls
                  threadId={threadId}
                  content={part.text}
                  message={message}
                  setMode={setMode}
                  setMessages={setMessages}
                  reload={reload}
                  stop={stop}
                />
              )}
            </div>
          ) : (
            <div key={key} className="group flex flex-col gap-2 w-full relative">
              <div
                className={cn(
                  "transition-all duration-500 relative",
                  usedWebSearch &&
                    "border-l-4 border-blue-500 pl-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg shadow-sm",
                  showAnimation && [
                    "transform scale-[1.02] shadow-lg",
                    "bg-gradient-to-r from-green-50 via-blue-50 to-purple-50",
                    "dark:from-green-950/20 dark:via-blue-950/20 dark:to-purple-950/20",
                    "border border-green-200 dark:border-green-800",
                  ],
                )}
              >
                <MarkdownRenderer
                  content={part.text}
                  id={message.id}
                  threadId={threadId}
                  messageId={message.id}
                  onCodeConvert={handleCodeConvert}
                />

                {/* Completion celebration effect */}
                {showAnimation && <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>}
              </div>

              {!isStreaming && (
                <MessageControls
                  threadId={threadId}
                  content={part.text}
                  message={message}
                  setMessages={setMessages}
                  reload={reload}
                  stop={stop}
                />
              )}
            </div>
          )
        }

        return null
      })}

      {/* Display sources if available */}
      {sources.length > 0 && message.role === "assistant" && !isStreaming && <MessageSources sources={sources} />}

      {/* Render file attachments if any */}
      {fileAttachments.length > 0 && (
        <div className={cn("mt-2", message.role === "user" ? "self-end max-w-[80%]" : "self-start w-full")}>
          <FileAttachmentViewer attachments={fileAttachments} />
        </div>
      )}
    </div>
  )
}

const PreviewMessage = memo(PureMessage, (prevProps, nextProps) => {
  if (prevProps.isStreaming !== nextProps.isStreaming) return false
  if (prevProps.message.id !== nextProps.message.id) return false
  if (prevProps.resumeComplete !== nextProps.resumeComplete) return false
  if (prevProps.resumedMessageId !== nextProps.resumedMessageId) return false
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false
  return true
})

PreviewMessage.displayName = "PreviewMessage"

export default PreviewMessage