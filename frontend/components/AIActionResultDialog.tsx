"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"
import { Copy, RefreshCw, X } from "lucide-react"
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
  result: AIActionResult | null
  onClose: () => void
  onRetry: () => void
}

export function AIActionResultDialog({ isOpen, result, onClose, onRetry }: AIActionResultDialogProps) {
  const [copiedOriginal, setCopiedOriginal] = useState(false)
  const [copiedResult, setCopiedResult] = useState(false)

  const copyToClipboard = async (text: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  if (!result) return null

  const actionTitle = result.action.charAt(0).toUpperCase() + result.action.slice(1)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {actionTitle} Result
              {result.modelUsed && (
                <Badge variant="secondary" className="text-xs">
                  {result.modelUsed}
                </Badge>
              )}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {result.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Error</h3>
              <p className="text-red-700 text-sm">{result.error}</p>
              <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Original Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">Original Text</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.originalText, setCopiedOriginal)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copiedOriginal ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-lg text-sm">{result.originalText}</div>
              </div>

              <Separator />

              {/* AI Result */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">{actionTitle}</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.result, setCopiedResult)}>
                      <Copy className="h-3 w-3 mr-1" />
                      {copiedResult ? "Copied!" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-background border rounded-lg text-sm whitespace-pre-wrap">{result.result}</div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
