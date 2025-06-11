"use client"

import { useEffect, useCallback } from "react"
import { useNavigate } from "react-router"
import { useSidebar } from "@/frontend/components/ui/sidebar"
import { useWebSearchStore } from "@/frontend/stores/WebSearchStore"

interface UseKeyboardShortcutsProps {
  onSendMessage?: () => void
  onClearInput?: () => void
  onUndoMessage?: () => void
  onStopGenerating?: () => void
  onPinMessage?: () => void
  onCopyMessage?: () => void
  onEditMessage?: () => void
}

export function useKeyboardShortcuts({
  onSendMessage,
  onClearInput,
  onUndoMessage,
  onStopGenerating,
  onPinMessage,
  onCopyMessage,
  onEditMessage,
}: UseKeyboardShortcutsProps = {}) {
  const navigate = useNavigate()
  const { toggleSidebar } = useSidebar()
  const { toggle: toggleWebSearch } = useWebSearchStore()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Handle Command+Shift+N and Command+Shift+P
      if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
        if (event.key === "N") {
          event.preventDefault()
          navigate("/chat")
          return
        }
        
        if (event.key === "P" && onPinMessage) {
          event.preventDefault()
          onPinMessage()
          return
        }
      }

      // Don't trigger other shortcuts if user is typing in an input or textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Navigation shortcuts
      if ((event.metaKey || event.ctrlKey) && event.key === "b") {
        event.preventDefault()
        toggleSidebar()
      } else if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        // TODO: Implement search conversations
      }

      // Conversation shortcuts
      else if ((event.metaKey || event.ctrlKey) && event.key === "Backspace" && onClearInput) {
        event.preventDefault()
        onClearInput()
      } else if ((event.metaKey || event.ctrlKey) && event.key === "z" && onUndoMessage) {
        event.preventDefault()
        onUndoMessage()
      } else if (event.key === "Escape" && onStopGenerating) {
        event.preventDefault()
        onStopGenerating()
      }

      // Message shortcuts
      else if ((event.metaKey || event.ctrlKey) && event.key === "c" && onCopyMessage) {
        event.preventDefault()
        onCopyMessage()
      } else if ((event.metaKey || event.ctrlKey) && event.key === "e" && onEditMessage) {
        event.preventDefault()
        onEditMessage()
      }
    },
    [
      navigate,
      toggleSidebar,
      toggleWebSearch,
      onSendMessage,
      onClearInput,
      onUndoMessage,
      onStopGenerating,
      onPinMessage,
      onCopyMessage,
      onEditMessage,
    ]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [handleKeyDown])
} 