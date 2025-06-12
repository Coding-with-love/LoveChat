"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Separator } from "./ui/separator"
import { MessageSquare, Languages, RefreshCw, FileText, X, Loader2 } from "lucide-react"
import LanguageSelectionDialog from "./LanguageSelectionDialog"

interface AIContextMenuProps {
  selectedText: string
  position: { x: number; y: number }
  onClose: () => void
  onAction: (
    action: "explain" | "translate" | "rephrase" | "summarize",
    text: string,
    targetLanguage?: string,
  ) => Promise<void>
  isProcessing?: boolean
}

const AIContextMenu: React.FC<AIContextMenuProps> = ({
  selectedText,
  position,
  onClose,
  onAction,
  isProcessing = false,
}) => {
  const [showLanguageDialog, setShowLanguageDialog] = useState(false)

  const handleAction = async (action: "explain" | "translate" | "rephrase" | "summarize") => {
    console.log("🎯 AI Action clicked:", action)

    if (action === "translate") {
      console.log("🌍 Opening language selection dialog")
      setShowLanguageDialog(true)
    } else {
      await onAction(action, selectedText)
    }
  }

  const handleLanguageSelect = async (language: string) => {
    console.log("🌍 Language selected for translation:", language)
    setShowLanguageDialog(false)
    await onAction("translate", selectedText, language)
  }

  const handleLanguageDialogClose = () => {
    console.log("🌍 Language dialog closed")
    setShowLanguageDialog(false)
  }

  console.log("🎯 AIContextMenu render - showLanguageDialog:", showLanguageDialog)

  return (
    <>
      {/* Backdrop to close menu */}
      <div className="fixed inset-0 z-40" onClick={onClose} style={{ backgroundColor: "transparent" }} />

      {/* Context Menu */}
      <Card
        className="fixed z-50 w-64 shadow-lg border"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">AI Actions</span>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => handleAction("explain")}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-3 w-3 mr-2" />
              )}
              Explain
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => handleAction("translate")}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <Languages className="h-3 w-3 mr-2" />
              )}
              Translate
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => handleAction("rephrase")}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-2" />
              )}
              Rephrase
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => handleAction("summarize")}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <FileText className="h-3 w-3 mr-2" />}
              Summarize
            </Button>
          </div>

          <Separator className="my-2" />

          <div className="text-xs text-muted-foreground">Selected: "{selectedText.slice(0, 30)}..."</div>
        </CardContent>
      </Card>

      {/* Language Selection Dialog */}
      {console.log("🌍 Rendering LanguageSelectionDialog with props:", {
        isOpen: showLanguageDialog,
        onClose: handleLanguageDialogClose,
        onSelect: handleLanguageSelect,
      })}
      <LanguageSelectionDialog
        isOpen={showLanguageDialog}
        onClose={handleLanguageDialogClose}
        onSelect={handleLanguageSelect}
      />
    </>
  )
}

export default AIContextMenu
