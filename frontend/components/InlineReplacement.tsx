"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Check, X, RefreshCw } from 'lucide-react'

interface InlineReplacementProps {
  newText: string
  onAccept: () => void
  onReject: () => void
  onRetry?: () => void
  isProcessing?: boolean
}

const InlineReplacement: React.FC<InlineReplacementProps> = ({
  newText,
  onAccept,
  onReject,
  onRetry,
  isProcessing = false,
}) => {
  return (
    <div className="fixed z-50 bg-white dark:bg-gray-800 rounded-md shadow-lg border p-3 max-w-md">
      <div className="space-y-3">
        <div className="text-sm font-medium">Suggested replacement:</div>
        <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm">
          {newText}
        </div>
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            <Button size="sm" onClick={onAccept} disabled={isProcessing} className="h-7">
              <Check className="h-3 w-3 mr-1" />
              Replace
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={isProcessing} className="h-7">
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
          {onRetry && (
            <Button size="sm" variant="ghost" onClick={onRetry} disabled={isProcessing} className="h-7">
              <RefreshCw className={`h-3 w-3 mr-1 ${isProcessing ? "animate-spin" : ""}`} />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default InlineReplacement
