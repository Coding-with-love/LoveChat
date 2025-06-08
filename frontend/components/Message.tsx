"use client"

import { memo, useState, useEffect, useRef } from "react"
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
// Import the new WebSearchBanner component
import WebSearchBanner from "./WebSearchBanner"

function PureMessage({
  threadId,
  message,
  setMessages,
  reload,
  isStreaming,
  registerRef,
  stop,
}: {
  threadId: string
  message: UIMessage
  setMessages: UseChatHelpers["setMessages"]
  reload: UseChatHelpers["reload"]
  isStreaming: boolean
  registerRef: (id: string, ref: HTMLDivElement | null) => void
  stop: UseChatHelpers["stop"]
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const messageRef = useRef<HTMLDivElement>(null)

  // Register this message's ref for navigation
  useEffect(() => {
    registerRef(message.id, messageRef.current)
    return () => registerRef(message.id, null)
  }, [message.id, registerRef])

  // Extract file attachments from message parts
  const fileAttachments = message.parts?.find((part) => part.type === "file_attachments")?.attachments || []

  // Extract sources if available
  const sources = message.parts?.find((part) => part.type === "sources")?.sources || []

  // Check if this message used web search
  const usedWebSearch = sources.length > 0

  // Filter out tool calls and other non-user-facing parts
  const displayParts =
    message.parts?.filter((part) => {
      // Only show text parts and reasoning for user messages
      if (message.role === "user") {
        return part.type === "text" || part.type === "reasoning"
      }
      // For assistant messages, show text and reasoning
      return part.type === "text" || part.type === "reasoning"
    }) || []

  return (
    <div
      ref={messageRef}
      role="article"
      className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start")}
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
            <div key={key} className="group flex flex-col gap-2 w-full">
              {/* Enhanced styling for web search responses */}
              <div
                className={cn(
                  "transition-all duration-300",
                  usedWebSearch &&
                    "border-l-4 border-blue-500 pl-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg shadow-sm",
                )}
              >
                <MarkdownRenderer content={part.text} id={message.id} />
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

        // Skip any other part types
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
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false
  return true
})

PreviewMessage.displayName = "PreviewMessage"

export default PreviewMessage
