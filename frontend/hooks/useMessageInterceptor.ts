"use client"

import { useEffect, useRef } from "react"
import type { UIMessage } from "ai"

interface ExtendedUIMessage extends UIMessage {
  attempts?: ExtendedUIMessage[]
}

interface UseMessageInterceptorProps {
  messages: ExtendedUIMessage[]
  setMessages: (messages: ExtendedUIMessage[] | ((prev: ExtendedUIMessage[]) => ExtendedUIMessage[])) => void
  regeneratingMessageId: string | null
  originalMessage: ExtendedUIMessage | null
  captureNewAttempt: (newMessage: ExtendedUIMessage) => ExtendedUIMessage | null
}

export function useMessageInterceptor({
  messages,
  setMessages,
  regeneratingMessageId,
  originalMessage,
  captureNewAttempt
}: UseMessageInterceptorProps) {
  const lastMessageCount = useRef(messages.length)
  const lastMessage = useRef<ExtendedUIMessage | null>(null)

  useEffect(() => {
    // Only check when we're tracking a regeneration
    if (!regeneratingMessageId || !originalMessage) {
      lastMessageCount.current = messages.length
      return
    }

    // Check if a new message was added (typical for regeneration)
    if (messages.length > lastMessageCount.current) {
      const newMessage = messages[messages.length - 1]
      
      // Check if this is a new assistant message (likely the regenerated response)
      if (newMessage.role === "assistant" && newMessage.id !== regeneratingMessageId) {
        console.log("🎯 Detected new assistant message during regeneration:", newMessage.id)
        
        const updatedMessage = captureNewAttempt(newMessage)
        if (updatedMessage) {
          // Replace the new message with the original message that now contains attempts
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages]
            updatedMessages[updatedMessages.length - 1] = updatedMessage
            return updatedMessages
          })
        }
      }
    }
    // Check if an existing message was modified (alternative regeneration approach)
    else if (messages.length === lastMessageCount.current) {
      const currentMessage = messages.find(m => m.id === regeneratingMessageId)
      const previous = lastMessage.current
      
      if (currentMessage && previous && 
          currentMessage.content !== originalMessage.content &&
          currentMessage.content !== previous.content) {
        console.log("🎯 Detected message content change during regeneration:", regeneratingMessageId)
        
        const updatedMessage = captureNewAttempt(currentMessage)
        if (updatedMessage) {
          setMessages(prevMessages => {
            return prevMessages.map(msg => 
              msg.id === regeneratingMessageId ? updatedMessage : msg
            )
          })
        }
      }
    }

    lastMessageCount.current = messages.length
    lastMessage.current = messages.find(m => m.id === regeneratingMessageId) || null
  }, [messages, regeneratingMessageId, originalMessage, captureNewAttempt, setMessages])
} 