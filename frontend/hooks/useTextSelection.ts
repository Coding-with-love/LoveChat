"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface TextSelection {
  text: string
  position: { x: number; y: number }
}

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleContextMenu = useCallback((event: MouseEvent) => {
    // Prevent default context menu when we have a selection
    const selectedText = window.getSelection()?.toString().trim()
    
    if (selectedText && selectedText.length > 3) {
      event.preventDefault()
    }
  }, [])

  const handleMouseUp = useCallback((event: MouseEvent) => {
    // Small delay to ensure selection is complete
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      const selectedText = window.getSelection()?.toString().trim()

      if (selectedText && selectedText.length > 3) {
        // Get the selection range to position the menu near the selected text
        const selectionObj = window.getSelection()
        if (selectionObj && selectionObj.rangeCount > 0) {
          const range = selectionObj.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          
          // Position the menu near the end of the selection
          const x = Math.min(rect.right + 10, window.innerWidth - 300)
          const y = Math.min(rect.bottom + 10, window.innerHeight - 200)

          setSelection({
            text: selectedText,
            position: { x, y },
          })
        } else {
          // Fallback to mouse position if range is not available
          const x = Math.min(event.clientX, window.innerWidth - 300)
          const y = Math.min(event.clientY, window.innerHeight - 200)

          setSelection({
            text: selectedText,
            position: { x, y },
          })
        }
      } else {
        setSelection(null)
      }
    }, 100)
  }, [])

  const handleClick = useCallback((event: MouseEvent) => {
    // Clear selection on regular clicks (not right-clicks)
    if (event.button === 0) { // Left click
      const selectedText = window.getSelection()?.toString().trim()
      if (!selectedText) {
        setSelection(null)
      }
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("click", handleClick)
    
    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection()
      }
    }
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("click", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleContextMenu, handleMouseUp, handleClick, clearSelection])

  return {
    selection,
    clearSelection,
  }
}
