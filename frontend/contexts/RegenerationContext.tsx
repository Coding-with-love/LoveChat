"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react"
import type { UIMessage } from "ai"

interface ExtendedUIMessage extends UIMessage {
  attempts?: ExtendedUIMessage[]
}

interface RegenerationContextType {
  regeneratingMessageId: string | null
  originalMessage: ExtendedUIMessage | null
  isRegenerating: boolean
  startRegeneration: (messageId: string, message: ExtendedUIMessage) => void
  finishRegeneration: () => void
  captureNewAttempt: (newMessage: ExtendedUIMessage) => ExtendedUIMessage | null
}

const RegenerationContext = createContext<RegenerationContextType | undefined>(undefined)

interface RegenerationProviderProps {
  children: ReactNode
  onMessageUpdate?: (updatedMessage: ExtendedUIMessage) => void
}

export function RegenerationProvider({ children, onMessageUpdate }: RegenerationProviderProps) {
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  const [originalMessage, setOriginalMessage] = useState<ExtendedUIMessage | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const startRegeneration = useCallback((messageId: string, message: ExtendedUIMessage) => {
    console.log("🔄 Starting regeneration for message:", messageId)
    setRegeneratingMessageId(messageId)
    setOriginalMessage(message)
    setIsRegenerating(true)
  }, [])

  const finishRegeneration = useCallback(() => {
    console.log("✅ Finishing regeneration")
    setRegeneratingMessageId(null)
    setOriginalMessage(null)
    setIsRegenerating(false)
  }, [])

  const captureNewAttempt = useCallback((newMessage: ExtendedUIMessage) => {
    if (!originalMessage || !regeneratingMessageId) {
      return null
    }

    console.log("📝 Capturing new attempt for message:", regeneratingMessageId, "New content:", newMessage.content?.substring(0, 100))
    
    // Create the updated message with attempts
    const updatedMessage: ExtendedUIMessage = {
      ...originalMessage,
      attempts: originalMessage.attempts ? [...originalMessage.attempts, newMessage] : [originalMessage, newMessage]
    }

    console.log("✅ Created message with attempts. Total attempts:", updatedMessage.attempts?.length)

    // Notify parent component
    onMessageUpdate?.(updatedMessage)

    // Clean up
    finishRegeneration()

    return updatedMessage
  }, [originalMessage, regeneratingMessageId, onMessageUpdate, finishRegeneration])

  const value: RegenerationContextType = {
    regeneratingMessageId,
    originalMessage,
    isRegenerating,
    startRegeneration,
    finishRegeneration,
    captureNewAttempt,
  }

  return <RegenerationContext.Provider value={value}>{children}</RegenerationContext.Provider>
}

export function useRegeneration() {
  const context = useContext(RegenerationContext)
  if (context === undefined) {
    throw new Error("useRegeneration must be used within a RegenerationProvider")
  }
  return context
} 