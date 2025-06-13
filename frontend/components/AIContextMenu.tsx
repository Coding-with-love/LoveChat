"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Loader2, Languages, RefreshCw, FileText, MessageSquare } from 'lucide-react'
import { useLanguageDialogStore } from "@/frontend/stores/LanguageDialogStore"

interface AIContextMenuProps {
  selectedText: string
  position: { x: number; y: number }
  onClose: () => void
  onAction: (
    action: "explain" | "translate" | "rephrase" | "summarize",
    text: string,
    targetLanguage?: string,
  ) => Promise<string | null>
  isProcessing: boolean
}

const AIContextMenu: React.FC<AIContextMenuProps> = ({ selectedText, position, onClose, onAction, isProcessing }) => {
  const { openDialog } = useLanguageDialogStore()
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y })
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  // Adjust menu position to ensure it's visible within viewport
  useEffect(() => {
    // Initial position from the selection
    let x = position.x
    let y = position.y

    console.log("🎯 AIContextMenu positioning debug:", {
      received: { x: position.x, y: position.y },
      viewport: { width: window.innerWidth, height: window.innerHeight }
    })

    // Wait for the menu to render so we can get its dimensions
    requestAnimationFrame(() => {
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        console.log("🎯 Menu dimensions:", {
          menuRect: { width: rect.width, height: rect.height },
          beforeAdjustment: { x, y }
        })

        // Adjust horizontal position if menu would go off-screen
        if (x + rect.width > viewportWidth - 10) {
          x = Math.max(10, viewportWidth - rect.width - 10)
        }

        // Ensure minimum left position
        if (x < 10) {
          x = 10
        }

        // Adjust vertical position if menu would go off-screen
        if (y + rect.height > viewportHeight - 10) {
          // Position above the selection if there's not enough space below
          const aboveY = position.y - rect.height - 10
          if (aboveY > 10) {
            y = aboveY
          } else {
            // If there's not enough space above either, position at the top of the viewport
            y = 10
          }
        }

        // Ensure minimum top position
        if (y < 10) {
          y = 10
        }

        console.log("🎯 Final adjusted position:", { x, y })
        setAdjustedPosition({ x, y })
      }
    })
  }, [position])

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const handleTranslate = () => {
    console.log("🌍 Translate button clicked!")
    setProcessingAction("translate")
    openDialog(selectedText, async (language: string) => {
      console.log(`🌍 Selected language: ${language}`)
      try {
        await onAction("translate", selectedText, language)
      } finally {
        setProcessingAction(null)
      }
    })
  }

  const handleRephrase = async () => {
    console.log("🔄 Rephrase button clicked!")
    setProcessingAction("rephrase")
    
    try {
      // Delegate to the parent's onAction handler which handles the proper save flow
      await onAction("rephrase", selectedText, undefined)
      console.log("✅ Rephrase delegated to parent successfully")
      
      // Close the context menu since the parent will handle the replacement UI
      onClose()
    } catch (error) {
      console.error("Failed to rephrase:", error)
    } finally {
      setProcessingAction(null)
    }
  }

  const handleExplain = async () => {
    setProcessingAction("explain")
    try {
      await onAction("explain", selectedText)
    } finally {
      setProcessingAction(null)
    }
  }

  const handleSummarize = async () => {
    setProcessingAction("summarize")
    try {
      await onAction("summarize", selectedText)
    } finally {
      setProcessingAction(null)
    }
  }



  return (
    <Card
      ref={menuRef}
      className="fixed z-50 p-2 shadow-lg border"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          onClick={handleExplain}
          disabled={processingAction === "explain" || isProcessing}
        >
          {processingAction === "explain" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          Explain
        </Button>
        <Button size="sm" variant="ghost" className="justify-start" onClick={handleTranslate} disabled={processingAction === "translate" || isProcessing}>
          {processingAction === "translate" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
          Translate
        </Button>
        <Button size="sm" variant="ghost" className="justify-start" onClick={handleRephrase} disabled={processingAction === "rephrase" || isProcessing}>
          {processingAction === "rephrase" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Rephrase
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          onClick={handleSummarize}
          disabled={processingAction === "summarize" || isProcessing}
        >
          {processingAction === "summarize" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4 mr-2" />
          )}
          Summarize
        </Button>
      </div>
    </Card>
  )
}

export default AIContextMenu
