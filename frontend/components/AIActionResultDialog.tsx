"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Copy, RefreshCw } from 'lucide-react'
import { useState } from "react"

interface AIActionResult {
  action: string
  originalText: string
  result: string
  modelUsed?: string
  error?: string
}

interface AIActionResultDialogProps {
  isOpen: boolean
  onClose: () => void
  result: AIActionResult | null
  onRetry?: () => void
}

const AIActionResultDialog: React.FC<AIActionResultDialogProps> = ({ isOpen, onClose, result, onRetry }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (result?.result) {
      try {
        await navigator.clipboard.writeText(result.result)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error("Failed to copy:", error)
      }
    }
  }

  const getActionTitle = (action: string) => {
    switch (action) {
      case "explain":
        return "Explanation"
      case "translate":
        return "Translation"
      case "rephrase":
        return "Rephrased Text"
      case "summarize":
        return "Summary"
      default:
        return "AI Result"
    }
  }

  if (!result) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {getActionTitle(result.action)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Text */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Original Text:</h4>
            <div className="p-3 bg-muted rounded-md text-sm">
              {result.originalText}
            </div>
          </div>

          {/* Result or Error */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {result.error ? "Error:" : "Result:"}
            </h4>
            <ScrollArea className="max-h-64">
              <div className={`p-3 rounded-md text-sm ${result.error ? "bg-red-50 text-red-900" : "bg-background border"}`}>
                {result.error || result.result}
              </div>
            </ScrollArea>
          </div>

          {/* Model Used */}
          {result.modelUsed && (
            <div className="text-xs text-muted-foreground">
              Model used: {result.modelUsed}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            {result.error && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            )}
            {!result.error && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-3 w-3 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AIActionResultDialog
