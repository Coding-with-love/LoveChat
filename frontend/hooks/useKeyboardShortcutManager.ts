"use client"

import { useEffect, useCallback, useState, useRef } from "react"

export interface ShortcutModifiers {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
}

export interface ShortcutHandler {
  key: string
  modifiers?: ShortcutModifiers
  description: string
  handler: () => void | Promise<void>
  preventDefault?: boolean
  allowInInput?: boolean
}

export interface ShortcutCategory {
  name: string
  shortcuts: ShortcutHandler[]
}

export function useKeyboardShortcutManager(categories: ShortcutCategory[]) {
  // Keep track of pressed keys for combinations
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  
  // Use ref for handlers to avoid unnecessary re-renders
  const handlersRef = useRef<ShortcutCategory[]>(categories)
  handlersRef.current = categories

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    
    // Update pressed keys
    setPressedKeys(prev => {
      const next = new Set(prev)
      next.add(key)
      return next
    })

    // Check if we're in an input/textarea and if the shortcut allows it
    const isInInput = event.target instanceof HTMLInputElement || 
                     event.target instanceof HTMLTextAreaElement ||
                     event.target instanceof HTMLSelectElement

    // Check all categories and their shortcuts
    for (const category of handlersRef.current) {
      for (const shortcut of category.shortcuts) {
        // Skip if we're in an input and the shortcut doesn't allow it
        if (isInInput && !shortcut.allowInInput) continue

        // Check if the pressed key matches
        if (key.toLowerCase() !== shortcut.key.toLowerCase()) continue

        // Check modifiers
        const modifiersMatch = 
          (!shortcut.modifiers?.ctrl || event.ctrlKey) &&
          (!shortcut.modifiers?.meta || event.metaKey) &&
          (!shortcut.modifiers?.shift || event.shiftKey) &&
          (!shortcut.modifiers?.alt || event.altKey) &&
          // If no modifiers specified, ensure no modifiers are pressed
          (shortcut.modifiers || (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey))

        if (modifiersMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler()
          return
        }
      }
    }
  }, [])

  // Handle keyup events
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    setPressedKeys(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  // Add and remove event listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("keyup", handleKeyUp, { capture: true })
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("keyup", handleKeyUp, { capture: true })
    }
  }, [handleKeyDown, handleKeyUp])

  // Return the current state of pressed keys and all registered shortcuts
  return {
    pressedKeys: Array.from(pressedKeys),
    shortcuts: handlersRef.current
  }
} 