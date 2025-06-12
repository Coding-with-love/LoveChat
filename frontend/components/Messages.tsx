"use client"

import { memo, useState, useRef } from "react"
import Message from "./Message"
import type { UIMessage } from "ai"
import type { UseChatHelpers } from "@ai-sdk/react"
import MessageLoading from "./ui/MessageLoading"
import Error from "./Error"
import ChatLandingPage from "./ChatLandingPage"
import { useAuth } from "@/frontend/components/AuthProvider"
import { getModelConfig } from "@/lib/models"
import { useTextSelection } from "@/frontend/hooks/useTextSelection"
import { useAIActions } from "@/frontend/hooks/useAIActions"
import AIContextMenu from "./AIContextMenu"
import AIActionResultDialog from "./AIActionResultDialog"
import InlineReplacement from "./InlineReplacement"
import { supabase } from "@/lib/supabase/client"
import { updateMessageInDatabase } from "@/lib/supabase/queries"
import { toast } from "sonner"

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

  // Text selection and AI actions
  const { selection, clearSelection } = useTextSelection()
  const { isProcessing, result, showResult, processAction, closeResult } = useAIActions()

  // Inline replacement state
  const [showReplacement, setShowReplacement] = useState(false)
  const [replacementText, setReplacementText] = useState("")
  const [originalText, setOriginalText] = useState("")
  const [isReplacing, setIsReplacing] = useState(false)
  const [replacementPosition, setReplacementPosition] = useState({ x: 0, y: 0 })
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null)
  const lastSelectionRef = useRef<Range | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleAIAction = async (
    action: "explain" | "translate" | "rephrase" | "summarize",
    text: string,
    targetLanguage?: string,
  ) => {
    console.log("🎯 AI Action triggered:", action, "for text:", text.substring(0, 50) + "...")

    // Save the current selection range for later use
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      lastSelectionRef.current = selection.getRangeAt(0).cloneRange()

      // Find which message contains this selection
      let messageElement = selection.anchorNode?.parentElement
      while (messageElement && !messageElement.dataset.messageId) {
        messageElement = messageElement.parentElement
      }

      if (messageElement?.dataset.messageId) {
        setTargetMessageId(messageElement.dataset.messageId)
        console.log("🎯 Target message ID:", messageElement.dataset.messageId)
      }
    }

    // For rephrase, show inline replacement
    if (action === "rephrase") {
      console.log("🔄 Starting rephrase with inline replacement")
      setIsReplacing(true)
      setOriginalText(text)

      // Calculate position for the replacement dialog
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setReplacementPosition({
          x: rect.left,
          y: rect.bottom + 10,
        })
      }

      try {
        const result = await processAction(action, text, targetLanguage, false)
        console.log("✅ Rephrase result:", result)

        if (result) {
          setReplacementText(result)
          setShowReplacement(true)
        }
      } catch (error) {
        console.error("❌ Failed to rephrase:", error)
      } finally {
        setIsReplacing(false)
      }
    } else {
      console.log("📋 Using dialog for action:", action)
      // For other actions, use the normal dialog
      await processAction(action, text, targetLanguage, true)
    }
  }

  const updateMessageContent = async (messageId: string, newContent: string) => {
    console.log("💾 Updating entire message content in database...")
    console.log("🔍 Debug info:", {
      messageId,
      newContentLength: newContent.length,
      newContentPreview: newContent.substring(0, 200),
    })

    setIsSaving(true)

    try {
      // Find the message in our current state
      const messageIndex = messages.findIndex((m) => m.id === messageId)
      if (messageIndex === -1) {
        console.error("❌ Message not found in state:", messageId)
        toast.error("Message not found in current state")
        return false
      }

      const message = messages[messageIndex]
      console.log("📄 Current message content:", {
        messageId: message.id,
        contentLength: message.content.length,
        contentPreview: message.content.substring(0, 200),
        role: message.role,
      })

      // Use the dedicated function to update the message
      console.log("💾 Calling updateMessageInDatabase with new content...")

      const success = await updateMessageInDatabase(messageId, newContent)

      if (!success) {
        console.error("❌ Failed to update message in database")
        toast.error("Failed to save changes to database")
        return false
      }

      // Verify the update worked by fetching the message again
      const { data: updatedMessage, error: verifyError } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .single()

      if (verifyError) {
        console.error("❌ Failed to verify update:", verifyError)
        toast.warning("Could not verify update")
      } else {
        console.log("✅ Verification - Updated message in DB:", {
          id: updatedMessage.id,
          contentLength: updatedMessage.content.length,
          contentPreview: updatedMessage.content.substring(0, 200),
        })

        // Check if content was actually updated
        if (updatedMessage.content !== newContent) {
          console.error("❌ Content mismatch after update:", {
            expectedLength: newContent.length,
            actualLength: updatedMessage.content.length,
            expectedPreview: newContent.substring(0, 200),
            actualPreview: updatedMessage.content.substring(0, 200),
          })
          toast.warning("Message may not have been updated correctly")
          return false
        } else {
          console.log("✅ Content verification passed - database content matches expected content")
        }
      }

      // Update in local state
      const updatedMessages = [...messages]
      updatedMessages[messageIndex] = {
        ...message,
        content: newContent,
      }
      setMessages(updatedMessages)

      console.log("✅ Message updated successfully in database and state")
      toast.success("Text replaced and saved successfully")

      // Add this after line 213 (after the success message)
      console.log("🔍 Final verification - fetching message directly from DB...")
      const { data: finalCheck, error: finalError } = await supabase
        .from("messages")
        .select("content")
        .eq("id", messageId)
        .single()

      if (finalError) {
        console.error("❌ Final check failed:", finalError)
      } else {
        console.log("✅ Final DB state:", {
          contentLength: finalCheck.content.length,
          contentPreview: finalCheck.content.substring(0, 200),
          matches: finalCheck.content === newContent,
        })
      }

      // Also log the current messages state
      console.log(
        "📋 Current messages state after update:",
        messages.map((m) => ({
          id: m.id,
          contentLength: m.content.length,
          contentPreview: m.content.substring(0, 100),
        })),
      )
      return true
    } catch (error) {
      console.error("❌ Unexpected error updating message:", error)
      toast.error("An unexpected error occurred")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const replaceSelectedText = async (newText: string) => {
    console.log("🔄 Starting replaceSelectedText with:", {
      newText: newText.substring(0, 100),
      originalText: originalText.substring(0, 100),
      targetMessageId,
    })

    if (!targetMessageId) {
      console.error("❌ No target message ID")
      toast.error("Could not identify target message")
      return
    }

    // Find the message in our current state
    const messageIndex = messages.findIndex((m) => m.id === targetMessageId)
    if (messageIndex === -1) {
      console.error("❌ Message not found in state:", targetMessageId)
      toast.error("Message not found")
      return
    }

    const message = messages[messageIndex]

    // Strategy: Replace the entire message content with a version where the original text is replaced
    // We'll use a more aggressive approach - find any occurrence of the original text and replace it
    let updatedContent = message.content

    // Try multiple replacement strategies
    console.log("🔄 Trying replacement strategies...")

    // Strategy 1: Direct replacement
    if (updatedContent.includes(originalText)) {
      console.log("✅ Strategy 1: Direct replacement")
      updatedContent = updatedContent.replace(originalText, newText)
    }
    // Strategy 2: Normalize whitespace and try again
    else {
      const normalizedOriginal = originalText.replace(/\s+/g, " ").trim()
      const normalizedContent = updatedContent.replace(/\s+/g, " ")

      if (normalizedContent.includes(normalizedOriginal)) {
        console.log("✅ Strategy 2: Normalized replacement")
        updatedContent = updatedContent.replace(
          new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          newText,
        )
      }
      // Strategy 3: Word-by-word replacement for partial matches
      else {
        console.log("🔄 Strategy 3: Word-by-word replacement")
        const words = originalText.split(/\s+/).filter((w) => w.length > 2)
        let foundWords = 0

        for (const word of words) {
          if (updatedContent.includes(word)) {
            foundWords++
          }
        }

        if (foundWords > words.length * 0.7) {
          console.log("✅ Strategy 3: Partial word replacement")
          // Replace the most significant words
          for (const word of words) {
            if (updatedContent.includes(word) && word.length > 4) {
              updatedContent = updatedContent.replace(word, newText.split(/\s+/)[0] || newText)
              break // Only replace the first significant word
            }
          }
        }
        // Strategy 4: Append the new text with context
        else {
          console.log("🔄 Strategy 4: Append with context")
          updatedContent = updatedContent + `\n\n*[Rephrased]: ${newText}*`
        }
      }
    }

    // Update the DOM immediately for visual feedback
    if (lastSelectionRef.current) {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(lastSelectionRef.current)

        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(newText))
        selection.removeAllRanges()
        console.log("✅ Text replaced in DOM")
      }
    }

    // Update the message content in database and state
    console.log("🔄 Proceeding with database update...")
    const success = await updateMessageContent(targetMessageId, updatedContent)
    if (!success) {
      console.error("❌ Failed to persist changes - consider reloading")
      toast.warning("Changes may not persist after reload")
    }
  }

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
    <>
      <section className="flex flex-col space-y-12">
        {messages.map((message, index) => (
          <div key={message.id} data-message-id={message.id}>
            <Message
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
          </div>
        ))}
        {status === "submitted" && <MessageLoading />}
        {error && <Error message={error.message} />}
      </section>

      {/* AI Context Menu for text selection */}
      {selection && selection.position && !showReplacement && (
        <AIContextMenu
          selectedText={selection.text}
          position={selection.position}
          onClose={clearSelection}
          onAction={handleAIAction}
          isProcessing={isProcessing || isReplacing}
        />
      )}

      {/* Inline Replacement */}
      {showReplacement && (
        <div
          style={{
            position: "fixed",
            left: replacementPosition.x,
            top: replacementPosition.y,
            zIndex: 50,
          }}
        >
          <InlineReplacement
            newText={replacementText}
            onAccept={async () => {
              await replaceSelectedText(replacementText)
              setShowReplacement(false)
              clearSelection()
              setTargetMessageId(null)
              setOriginalText("")
            }}
            onReject={() => {
              setShowReplacement(false)
              clearSelection()
              setTargetMessageId(null)
              setOriginalText("")
            }}
            onRetry={async () => {
              setIsReplacing(true)
              try {
                const result = await processAction("rephrase", originalText, undefined, false)
                if (result) {
                  setReplacementText(result)
                }
              } catch (error) {
                console.error("Failed to retry rephrase:", error)
              } finally {
                setIsReplacing(false)
              }
            }}
            isProcessing={isReplacing || isSaving}
          />
        </div>
      )}

      {/* AI Action Result Dialog */}
      <AIActionResultDialog isOpen={showResult} onClose={closeResult} result={result} />
    </>
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
