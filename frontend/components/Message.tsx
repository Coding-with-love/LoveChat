"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import MarkdownRenderer from "@/frontend/components/MemoizedMarkdown"
import { cn } from "@/lib/utils"
import type { UIMessage } from "ai"
import MessageControls from "./MessageControls"
import type { UseChatHelpers } from "@ai-sdk/react"
import MessageEditor from "./MessageEditor"
import MessageReasoning from "./MessageReasoning"
import FileAttachmentViewer from "./FileAttachmentViewer"
import MessageSources from "./MessageSources"
import WebSearchBanner from "./WebSearchBanner"
import { useKeyboardShortcuts } from "@/frontend/hooks/useKeyboardShortcuts"
import { useTextSelection } from "@/frontend/hooks/useTextSelection"
import { useAIActions } from "@/frontend/hooks/useAIActions"
import AIContextMenu from "./AIContextMenu"
import AIActionResultDialog from "./AIActionResultDialog"
import { ThinkingToggle } from "./ThinkingToggle"
import ThinkingContent from "./ThinkingContent"
import { ThinkingIndicator } from "./ThinkingIndicator"
import MessageContentRenderer from "./MessageContentRenderer"

// Helper function to check equality (you might want to import this from a utility library)
function equal(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Extend UIMessage to include reasoning field
interface ExtendedUIMessage extends UIMessage {
  reasoning?: string
}

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
  showThinking,
  toggleThinking,
  isThinkingModel,
  onRevertToOriginal,
}: {
  threadId: string
  message: ExtendedUIMessage
  setMessages: UseChatHelpers["setMessages"]
  reload: UseChatHelpers["reload"]
  isStreaming: boolean
  registerRef: (id: string, ref: HTMLDivElement | null) => void
  stop: UseChatHelpers["stop"]
  resumeComplete?: boolean
  resumedMessageId?: string | null
  showThinking?: boolean
  toggleThinking?: () => void
  isThinkingModel?: boolean
  onRevertToOriginal?: (originalText: string) => void
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [showAnimation, setShowAnimation] = useState(false)
  const [isCurrentlyThinking, setIsCurrentlyThinking] = useState(false)
  const messageRef = useRef<HTMLDivElement>(null)

  // AI Actions functionality
  const { selection, clearSelection } = useTextSelection()
  const {
    isProcessing: isAIProcessing,
    result: aiResult,
    showResult: showAIResult,
    processAction,
    closeResult: closeAIResult,
    retryAction,
  } = useAIActions()

  // Register this message's ref for navigation
  useEffect(() => {
    registerRef(message.id, messageRef.current)
    return () => registerRef(message.id, null)
  }, [message.id, registerRef])

  // Handle thinking state for streaming messages
  useEffect(() => {
    if (isStreaming && isThinkingModel && message.role === "assistant") {
      // Show thinking indicator while streaming and no content yet
      const hasContent = message.parts?.some((part) => part.type === "text" && part.text.trim())
      setIsCurrentlyThinking(!hasContent)
    } else {
      setIsCurrentlyThinking(false)
    }
  }, [isStreaming, isThinkingModel, message.role, message.parts])

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
  const fileAttachments = (message.parts?.find((part) => (part as any).type === "file_attachments") as any)?.attachments || []

  // Extract sources if available
  const sources: any[] = []

  // Check if this message used web search
  const usedWebSearch = sources.length > 0

  // Extract reasoning from message - check multiple sources
  const reasoning =
    message.reasoning ||
    message.parts?.find((part) => part.type === "reasoning")?.reasoning ||
    (() => {
      // Also check if thinking content is embedded in text parts
      const textPart = message.parts?.find((part) => part.type === "text")
      if (textPart?.text?.includes("<Thinking>") && textPart?.text?.includes("</Thinking>")) {
        const thinkMatch = textPart.text.match(/<Thinking>([\s\S]*?)<\/Thinking>/)
        return thinkMatch ? thinkMatch[1].trim() : null
      }
      return null
    })()

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

  // Handle keyboard shortcuts
  const handleCopy = useCallback(() => {
    const textPart = displayParts.find((part) => part.type === "text")
    if (textPart) {
      navigator.clipboard.writeText(textPart.text)
    }
  }, [displayParts])

  const handleEdit = useCallback(() => {
    if (mode === "view") {
      setMode("edit")
    }
  }, [mode])

  const handlePin = useCallback(() => {
    // Pin functionality is handled in MessageControls
    // We'll pass this through to MessageControls
  }, [])

  const handleAIAction = useCallback(
    async (
      action: "explain" | "translate" | "rephrase" | "summarize",
      text: string,
      targetLanguage?: string,
    ): Promise<string | null> => {
      const result = await processAction(action, text, targetLanguage)
      clearSelection()
      return result
    },
    [processAction, clearSelection],
  )

  // Handle keyboard shortcuts with AI actions
  const handleExplainSelection = useCallback(() => {
    const selectedText = window.getSelection()?.toString().trim()
    if (selectedText && selectedText.length > 3) {
      handleAIAction("explain", selectedText)
    }
  }, [handleAIAction])

  const handleTranslateSelection = useCallback(() => {
    const selectedText = window.getSelection()?.toString().trim()
    if (selectedText && selectedText.length > 3) {
      handleAIAction("translate", selectedText, "Spanish")
    }
  }, [handleAIAction])

  const handleRephraseSelection = useCallback(() => {
    const selectedText = window.getSelection()?.toString().trim()
    if (selectedText && selectedText.length > 3) {
      handleAIAction("rephrase", selectedText)
    }
  }, [handleAIAction])

  useKeyboardShortcuts({
    onCopyMessage: handleCopy,
    onEditMessage: handleEdit,
    onPinMessage: handlePin,
  })

  // Check if the selection is within this message component
  const isSelectionInThisMessage = useCallback(() => {
    if (!selection || !messageRef.current) return false

    const selectionNode = window.getSelection()?.anchorNode
    if (!selectionNode) return false

    return messageRef.current.contains(selectionNode)
  }, [selection])

  return (
    <div
      ref={messageRef}
      role="article"
      className={cn(
        "flex flex-col transition-all duration-500 relative",
        message.role === "user" ? "items-end" : "items-start",
        showAnimation && "animate-pulse",
      )}
      data-message-id={message.id}
      data-message-content="true" // Add this attribute to help identify message content areas
    >
      {/* Web Search Banner for Assistant Messages */}
      {message.role === "assistant" && usedWebSearch && <WebSearchBanner />}

      {/* Thinking Indicator for streaming thinking models */}
      {isCurrentlyThinking && (
        <div className="mb-3">
          <ThinkingIndicator isVisible={true} />
        </div>
      )}

      {(() => {
        // For assistant messages, render reasoning parts first, then text parts
        if (message.role === "assistant") {
          const reasoningParts = displayParts.filter((part) => part.type === "reasoning")
          const textParts = displayParts.filter((part) => part.type === "text")
          const orderedParts = [...reasoningParts, ...textParts]

          return orderedParts.map((part, index) => {
            const { type } = part
            const key = `message-${message.id}-part-${index}`

            if (type === "reasoning") {
              return <MessageReasoning key={key} reasoning={part.reasoning} id={message.id} />
            }

            if (type === "text") {
              // CRITICAL FIX: Use message.content if available (for updated messages), otherwise fall back to part.text
              // This ensures that rephrased text saved to the database is displayed correctly
              let cleanText = message.content || part.text
              let extractedThinking = ""

              if (cleanText.includes("<Thinking>") && cleanText.includes("</Thinking>")) {
                // Extract thinking content for potential display
                const thinkMatches = cleanText.match(/<Thinking>([\s\S]*?)<\/Thinking>/g)
                if (thinkMatches) {
                  thinkMatches.forEach((match) => {
                    extractedThinking += match.replace(/<Thinking>|<\/Thinking>/g, "") + "\n"
                  })
                }

                // Remove thinking tags from displayed content
                cleanText = cleanText.replace(/<Thinking>[\s\S]*?<\/Thinking>/g, "").trim()
              }

              return (
                <div key={key} className="group flex flex-col gap-2 w-full relative" data-message-content-part="true">
                  {/* Thinking Toggle - Show before content for assistant messages with reasoning */}
                  {message.role === "assistant" && (reasoning || extractedThinking) && (
                    <div className="flex items-center gap-2 mb-2">
                      <ThinkingToggle
                        isExpanded={showThinking || false}
                        onToggle={toggleThinking || (() => {})}
                        hasReasoning={!!(reasoning || extractedThinking)}
                      />
                    </div>
                  )}

                  {/* Thinking Content - Show when expanded */}
                  {message.role === "assistant" && (reasoning || extractedThinking) && showThinking && (
                    <ThinkingContent reasoning={reasoning || extractedThinking} />
                  )}

                  <div
                    className={cn(
                      "transition-all duration-500 relative select-text",
                      usedWebSearch &&
                        "border-l-4 border-blue-500 pl-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg shadow-sm",
                      showAnimation && [
                        "transform scale-[1.02] shadow-lg",
                        "bg-gradient-to-r from-green-50 via-blue-50 to-purple-50",
                        "dark:from-green-950/20 dark:via-blue-950/20 dark:to-purple-950/20",
                        "border border-green-200 dark:border-green-800",
                      ],
                    )}
                    data-message-text-content="true" // Add this attribute to help identify text content areas
                  >
                    <MessageContentRenderer
                      content={cleanText}
                      messageId={message.id}
                      threadId={threadId}
                      onCodeConvert={handleCodeConvert}
                      onRevertRephrase={onRevertToOriginal}
                      isMarkdown={true}
                    />

                    {/* Completion celebration effect */}
                    {showAnimation && <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>}
                  </div>

                  {!isStreaming && (
                    <MessageControls
                      threadId={threadId}
                      content={cleanText}
                      message={message}
                      setMessages={setMessages}
                      reload={reload}
                      stop={stop}
                      onCopy={handleCopy}
                      onEdit={handleEdit}
                      onPin={handlePin}
                    />
                  )}
                </div>
              )
            }

            return null
          })
        }

        // For user messages, keep original order
        return displayParts.map((part, index) => {
          const { type } = part
          const key = `message-${message.id}-part-${index}`

          if (type === "reasoning") {
            return <MessageReasoning key={key} reasoning={part.reasoning} id={message.id} />
          }

          if (type === "text") {
            // CRITICAL FIX: Use message.content if available (for updated messages), otherwise fall back to part.text
            // This ensures that rephrased text saved to the database is displayed correctly
            let cleanText = message.content || part.text
            if (cleanText.includes("<Thinking>") && cleanText.includes("</Thinking>")) {
              cleanText = cleanText.replace(/<Thinking>[\s\S]*?<\/Thinking>/g, "").trim()
            }

            return message.role === "user" ? (
              <div
                key={key}
                className="relative group px-4 py-3 rounded-xl bg-secondary border border-secondary-foreground/2 max-w-[80%]"
                data-message-content-part="true"
              >
                {mode === "edit" && (
                  <MessageEditor
                    threadId={threadId}
                    message={message}
                    content={cleanText}
                    setMessages={setMessages}
                    reload={reload}
                    setMode={setMode}
                    stop={stop}
                  />
                )}
                {mode === "view" && (
                  <MessageContentRenderer
                    content={cleanText}
                    messageId={message.id}
                    threadId={threadId}
                    onRevertRephrase={onRevertToOriginal}
                    isMarkdown={false}
                  />
                )}

                {mode === "view" && (
                  <MessageControls
                    threadId={threadId}
                    content={cleanText}
                    message={message}
                    setMode={setMode}
                    setMessages={setMessages}
                    reload={reload}
                    stop={stop}
                    onCopy={handleCopy}
                    onEdit={handleEdit}
                    onPin={handlePin}
                  />
                )}
              </div>
            ) : (
              <div key={key} className="group flex flex-col gap-2 w-full relative" data-message-content-part="true">
                {/* Thinking Toggle - Show before content for assistant messages with reasoning */}
                {message.role === "assistant" && reasoning && (
                  <div className="flex items-center gap-2 mb-2">
                    <ThinkingToggle
                      isExpanded={showThinking || false}
                      onToggle={toggleThinking || (() => {})}
                      hasReasoning={!!reasoning}
                    />
                  </div>
                )}

                {/* Thinking Content - Show when expanded */}
                {message.role === "assistant" && reasoning && showThinking && (
                  <ThinkingContent reasoning={reasoning} />
                )}

                <div
                  className={cn(
                    "transition-all duration-500 relative select-text",
                    usedWebSearch &&
                      "border-l-4 border-blue-500 pl-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg shadow-sm",
                    showAnimation && [
                      "transform scale-[1.02] shadow-lg",
                      "bg-gradient-to-r from-green-50 via-blue-50 to-purple-50",
                      "dark:from-green-950/20 dark:via-blue-950/20 dark:to-purple-950/20",
                      "border border-green-200 dark:border-green-800",
                    ],
                  )}
                  data-message-text-content="true" // Add this attribute to help identify text content areas
                >
                  <MessageContentRenderer
                    content={cleanText}
                    messageId={message.id}
                    threadId={threadId}
                    onCodeConvert={handleCodeConvert}
                    onRevertRephrase={onRevertToOriginal}
                    isMarkdown={true}
                  />

                  {/* Completion celebration effect */}
                  {showAnimation && <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>}
                </div>

                {!isStreaming && (
                  <MessageControls
                    threadId={threadId}
                    content={cleanText}
                    message={message}
                    setMessages={setMessages}
                    reload={reload}
                    stop={stop}
                    onCopy={handleCopy}
                    onEdit={handleEdit}
                    onPin={handlePin}
                  />
                )}
              </div>
            )
          }

          return null
        })
      })()}

      {/* Display sources if available */}
      {sources.length > 0 && message.role === "assistant" && !isStreaming && <MessageSources sources={sources} />}

      {/* Render file attachments if any */}
      {fileAttachments.length > 0 && (
        <div className={cn("mt-2", message.role === "user" ? "self-end max-w-[80%]" : "self-start w-full")}>
          <FileAttachmentViewer attachments={fileAttachments} />
        </div>
      )}

      {/* AI Context Menu - Only show if selection is within this message */}
      {selection && isSelectionInThisMessage() && (
        <AIContextMenu
          selectedText={selection.text}
          position={selection.position}
          onClose={clearSelection}
          onAction={handleAIAction}
          isProcessing={isAIProcessing}
        />
      )}

      {/* AI Action Result Dialog */}
      <AIActionResultDialog isOpen={showAIResult} onClose={closeAIResult} result={aiResult} onRetry={retryAction} />
    </div>
  )
}

const Message = memo(PureMessage, (prevProps, nextProps) => {
  if (prevProps.isStreaming !== nextProps.isStreaming) return false
  if (prevProps.message.id !== nextProps.message.id) return false
  if (prevProps.resumeComplete !== nextProps.resumeComplete) return false
  if (prevProps.resumedMessageId !== nextProps.resumedMessageId) return false
  if (prevProps.showThinking !== nextProps.showThinking) return false
  if (prevProps.isThinkingModel !== nextProps.isThinkingModel) return false
  if (prevProps.message.content !== nextProps.message.content) return false
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false
  if (prevProps.message.reasoning !== nextProps.message.reasoning) return false
  return true
})

Message.displayName = "Message"

export default Message
