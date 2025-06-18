"use client"

import { useState, useCallback, useRef } from "react"
import type { UIMessage } from "ai"

interface ExtendedUIMessage extends UIMessage {
  attempts?: ExtendedUIMessage[]
}

export function useRegenerationTracker() {
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  const regenerationMap = useRef<Map<string, ExtendedUIMessage>>(new Map())

  const startRegeneration = useCallback((messageId: string, originalMessage: ExtendedUIMessage) => {
    console.log("🔄 Starting regeneration tracking for:", messageId)
    setRegeneratingMessageId(messageId)
    regenerationMap.current.set(messageId, originalMessage)
  }, [])

  const captureNewAttempt = useCallback((messages: ExtendedUIMessage[]) => {
    if (!regeneratingMessageId) return messages

    // Find the message that was being regenerated
    const originalMessage = regenerationMap.current.get(regeneratingMessageId)
    if (!originalMessage) {
      console.log("❌ No original message found for regeneration:", regeneratingMessageId)
      return messages
    }

    // Find the new message in the messages array
    const messageIndex = messages.findIndex(m => m.id === regeneratingMessageId)
    if (messageIndex === -1) {
      // Message was removed, look for a new assistant message at the end
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === "assistant" && lastMessage.id !== regeneratingMessageId) {
        console.log("📝 Found new attempt message:", lastMessage.id)
        
        // Create the updated original message with attempts
        const updatedOriginal: ExtendedUIMessage = {
          ...originalMessage,
          attempts: originalMessage.attempts ? [...originalMessage.attempts, lastMessage] : [originalMessage, lastMessage]
        }

        // Replace the last message with the updated original (now containing attempts)
        const updatedMessages = [...messages]
        updatedMessages[messages.length - 1] = updatedOriginal
        
        console.log("✅ Added attempt to message. Total attempts:", updatedOriginal.attempts?.length)
        
        // Clean up
        setRegeneratingMessageId(null)
        regenerationMap.current.delete(regeneratingMessageId)
        
        return updatedMessages
      }
    } else {
      // Message still exists, check if content changed
      const currentMessage = messages[messageIndex]
      if (currentMessage.content !== originalMessage.content) {
        console.log("📝 Message content changed, adding as new attempt")
        
        const updatedMessage: ExtendedUIMessage = {
          ...originalMessage,
          attempts: originalMessage.attempts ? [...originalMessage.attempts, currentMessage] : [originalMessage, currentMessage]
        }

        const updatedMessages = [...messages]
        updatedMessages[messageIndex] = updatedMessage
        
        console.log("✅ Added attempt to existing message. Total attempts:", updatedMessage.attempts?.length)
        
        // Clean up
        setRegeneratingMessageId(null)
        regenerationMap.current.delete(regeneratingMessageId)
        
        return updatedMessages
      }
    }

    return messages
  }, [regeneratingMessageId])

  const finishRegeneration = useCallback(() => {
    console.log("✅ Finishing regeneration")
    if (regeneratingMessageId) {
      regenerationMap.current.delete(regeneratingMessageId)
    }
    setRegeneratingMessageId(null)
  }, [regeneratingMessageId])

  return {
    regeneratingMessageId,
    startRegeneration,
    captureNewAttempt,
    finishRegeneration
  }
} 