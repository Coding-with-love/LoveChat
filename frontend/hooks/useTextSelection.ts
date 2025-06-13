"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface TextSelection {
  text: string
  position: { x: number; y: number }
}

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

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
        // Check if selection is within a valid area
        const isValidSelection = isValidSelectionTarget(window.getSelection())

        if (!isValidSelection) {
          setSelection(null)
          return
        }

        // Get the selection range to position the menu near the selected text
        const selectionObj = window.getSelection()
        if (selectionObj && selectionObj.rangeCount > 0) {
          const range = selectionObj.getRangeAt(0)
          const rect = range.getBoundingClientRect()

          // Debug logging to understand what's happening
          console.log("📍 Selection positioning debug:", {
            rect: {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height
            },
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            scroll: {
              x: window.scrollX,
              y: window.scrollY
            }
          })

          // Position the menu at the left edge of selection for more predictable positioning
          // Use viewport coordinates (don't add scroll offsets for fixed positioning)
          setSelection({
            text: selectedText,
            position: {
              x: Math.max(10, rect.left), // Ensure at least 10px from left edge
              y: rect.bottom + 5, // Add small offset below selection
            },
          })
        } else {
          // Fallback to mouse position if range is not available
          setSelection({
            text: selectedText,
            position: {
              x: event.clientX,
              y: event.clientY,
            },
          })
        }
      } else {
        setSelection(null)
      }
    }, 100)
  }, [])

  // Helper function to check if selection is within a valid target
  function isValidSelectionTarget(selection: Selection | null): boolean {
    if (!selection || selection.rangeCount === 0) return false

         // Get the common ancestor of the selection
     const range = selection.getRangeAt(0)
     let node: Node | null = range.commonAncestorContainer

     // Traverse up the DOM tree to find if we're in a valid area
     while (node && node !== document.body) {
      // Check if we're in a code block header (exclude)
      if (
        node instanceof HTMLElement &&
        (node.hasAttribute("data-code-block-header") ||
          (node.classList.contains("flex") && 
           node.classList.contains("items-center") && 
           node.classList.contains("bg-secondary")))
      ) {
        return false
      }

      // Check if we're in a message content area (include)
      if (
        node instanceof HTMLElement &&
        (node.hasAttribute("data-message-id") ||
          node.hasAttribute("data-message-content") ||
          node.hasAttribute("data-message-text-content") ||
          node.hasAttribute("data-code-block-content") ||
          node.classList.contains("whitespace-pre-wrap") ||
          node.classList.contains("prose") ||
          // Include pre and code elements for code blocks
          node.tagName === "PRE" ||
          node.tagName === "CODE")
      ) {
        return true
             }

       node = node.parentNode as Node | null
       if (!node) break
     }

    return false
  }

  const handleClick = useCallback((event: MouseEvent) => {
    // Clear selection on regular clicks (not right-clicks)
    if (event.button === 0) {
      // Left click
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
