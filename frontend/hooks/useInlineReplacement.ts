"use client"

import { useState, useCallback } from "react"

interface InlineReplacementData {
  originalText: string
  newText: string
  position: { x: number; y: number }
  onAccept: () => void
  onRetry: () => void
}

export function useInlineReplacement() {
  const [replacement, setReplacement] = useState<InlineReplacementData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const showReplacement = useCallback(
    (
      originalText: string,
      newText: string,
      position: { x: number; y: number },
      onAccept: () => void,
      onRetry: () => void,
    ) => {
      setReplacement({
        originalText,
        newText,
        position,
        onAccept: () => {
          onAccept()
          setReplacement(null)
        },
        onRetry: () => {
          setIsProcessing(true)
          onRetry()
        },
      })
    },
    [],
  )

  const hideReplacement = useCallback(() => {
    setReplacement(null)
    setIsProcessing(false)
  }, [])

  const updateReplacement = useCallback((newText: string) => {
    setReplacement((prev) => {
      if (!prev) return null
      return {
        ...prev,
        newText,
      }
    })
    setIsProcessing(false)
  }, [])

  return {
    replacement,
    isProcessing,
    showReplacement,
    hideReplacement,
    updateReplacement,
    setIsProcessing,
  }
}
