"use client"

import { useCallback, useRef, useState } from "react"

export const useChatNavigator = () => {
  const [isNavigatorVisible, setIsNavigatorVisible] = useState(false)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const registerRef = useCallback((id: string, ref: HTMLDivElement | null) => {
    if (ref) {
      messageRefs.current[id] = ref
      console.log("📝 Registered message ref:", id, "Total refs:", Object.keys(messageRefs.current).length)
    } else {
      delete messageRefs.current[id]
      console.log("🗑️ Unregistered message ref:", id, "Remaining refs:", Object.keys(messageRefs.current).length)
    }
  }, [])

  const scrollToMessage = useCallback((messageId: string) => {
    console.log("🎯 Attempting to scroll to message:", messageId)
    console.log("📋 Available message refs:", Object.keys(messageRefs.current))

    const ref = messageRefs.current[messageId]
    if (ref) {
      console.log("✅ Found ref, scrolling to message:", messageId)

      // Scroll to the message
      ref.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      })

      // Add a highlight effect
      ref.style.transition = "background-color 0.5s ease, box-shadow 0.5s ease"
      ref.style.backgroundColor = "rgba(59, 130, 246, 0.1)"
      ref.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.3)"

      setTimeout(() => {
        ref.style.backgroundColor = ""
        ref.style.boxShadow = ""
      }, 3000)
    } else {
      console.log("❌ Message ref not found for ID:", messageId)
      console.log("🔍 Trying to find element by data attribute...")

      // Fallback: try to find by data attribute
      const element = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLDivElement
      if (element) {
        console.log("✅ Found element by data attribute, scrolling...")
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        })

        // Add highlight effect
        element.style.transition = "background-color 0.5s ease, box-shadow 0.5s ease"
        element.style.backgroundColor = "rgba(59, 130, 246, 0.1)"
        element.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.3)"

        setTimeout(() => {
          element.style.backgroundColor = ""
          element.style.boxShadow = ""
        }, 3000)
      } else {
        console.log("❌ Element not found by data attribute either")
      }
    }
  }, [])

  const handleToggleNavigator = useCallback(() => {
    setIsNavigatorVisible((prev) => !prev)
  }, [])

  const closeNavigator = useCallback(() => {
    setIsNavigatorVisible(false)
  }, [])

  return {
    isNavigatorVisible,
    handleToggleNavigator,
    closeNavigator,
    registerRef,
    scrollToMessage,
  }
}
