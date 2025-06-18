"use client"

import { useState, useCallback } from "react"
import type { UIMessage } from "ai"

interface ExtendedUIMessage extends UIMessage {
  attempts?: ExtendedUIMessage[]
  currentAttemptIndex?: number
}

export function useMessageAttempts() {
  const [messageAttempts, setMessageAttempts] = useState<Record<string, ExtendedUIMessage[]>>({})

  const addAttempt = useCallback((messageId: string, newAttempt: ExtendedUIMessage) => {
    setMessageAttempts(prev => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), newAttempt]
    }))
  }, [])

  const getAttempts = useCallback((messageId: string) => {
    return messageAttempts[messageId] || []
  }, [messageAttempts])

  const getAttemptCount = useCallback((messageId: string) => {
    return messageAttempts[messageId]?.length || 0
  }, [messageAttempts])

  const clearAttempts = useCallback((messageId: string) => {
    setMessageAttempts(prev => {
      const updated = { ...prev }
      delete updated[messageId]
      return updated
    })
  }, [])

  // Add a new attempt to a message and update the messages array
  const addMessageAttempt = useCallback((
    messages: ExtendedUIMessage[],
    messageId: string,
    newAttempt: ExtendedUIMessage,
    setMessages: (messages: ExtendedUIMessage[] | ((prev: ExtendedUIMessage[]) => ExtendedUIMessage[])) => void
  ) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const existingAttempts = msg.attempts || [msg]
        return {
          ...msg,
          attempts: [...existingAttempts, newAttempt],
          currentAttemptIndex: existingAttempts.length // Set to the new attempt
        }
      }
      return msg
    })
    
    setMessages(updatedMessages)
    addAttempt(messageId, newAttempt)
  }, [addAttempt])

  return {
    messageAttempts,
    addAttempt,
    getAttempts,
    getAttemptCount,
    clearAttempts,
    addMessageAttempt
  }
} 