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

    const performScroll = (element: HTMLElement) => {
      console.log("✅ Found element, scrolling to message:", messageId)

      // Calculate offset for sticky header (estimate ~80px for header + search bar)
      const headerOffset = 100
      const elementTop = element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementTop - headerOffset

      // Scroll to the calculated position
      window.scrollTo({
        top: Math.max(0, offsetPosition), // Ensure we don't scroll past the top
        behavior: "smooth",
      })

      // Add a highlight effect with improved styling
      element.style.transition = "all 0.5s ease"
      element.style.backgroundColor = "rgba(59, 130, 246, 0.15)"
      element.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.3)"
      element.style.borderRadius = "8px"
      element.style.transform = "scale(1.02)"

      // Enhanced highlight removal with fade out
      setTimeout(() => {
        element.style.backgroundColor = "transparent"
        element.style.boxShadow = "0 0 0 0px transparent"
        element.style.transform = "scale(1)"
        
        // Remove all styles after transition
        setTimeout(() => {
          element.style.transition = ""
          element.style.backgroundColor = ""
          element.style.boxShadow = ""
          element.style.borderRadius = ""
          element.style.transform = ""
        }, 500)
      }, 2500)
    }

    // Try ref-based scrolling first
    const ref = messageRefs.current[messageId]
    if (ref) {
      performScroll(ref)
      return
    }

    console.log("❌ Message ref not found for ID:", messageId)
    console.log("🔍 Trying to find element by data attribute...")

    // Fallback: try to find by data attribute with retry mechanism
    const findAndScrollToElement = (attempts = 0) => {
      const element = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLDivElement
      
      if (element) {
        console.log("✅ Found element by data attribute, scrolling...")
        performScroll(element)
      } else if (attempts < 3) {
        // Retry up to 3 times with increasing delays
        const delay = (attempts + 1) * 100
        console.log(`🔄 Element not found, retrying in ${delay}ms (attempt ${attempts + 1}/3)`)
        setTimeout(() => findAndScrollToElement(attempts + 1), delay)
      } else {
        console.log("❌ Element not found by data attribute after 3 attempts")
      }
    }

    findAndScrollToElement()
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
