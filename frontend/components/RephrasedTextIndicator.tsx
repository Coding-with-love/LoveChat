import React, { useState } from 'react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { RotateCcw, Eye, EyeOff, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RephrasedTextIndicatorProps {
  originalText: string
  rephrasedText: string
  onRevert: () => void
  className?: string
}

export default function RephrasedTextIndicator({ 
  originalText, 
  rephrasedText, 
  onRevert,
  className 
}: RephrasedTextIndicatorProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)

  const handleRevert = () => {
    onRevert()
    setShowRevertConfirm(false)
    setShowOriginal(false)
  }

  return (
    <span className={cn("relative group inline", className)}>
      {/* Rephrased text indicator buttons */}
      <span className="absolute -top-8 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <TooltipProvider>
          {/* Toggle original/rephrased view */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-xs"
                onClick={() => setShowOriginal(!showOriginal)}
              >
                {showOriginal ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showOriginal ? 'Show rephrased text' : 'Show original text'}
            </TooltipContent>
          </Tooltip>

          {/* Revert button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900 dark:hover:bg-amber-800 text-xs"
                onClick={() => setShowRevertConfirm(true)}
              >
                <RotateCcw className="h-2.5 w-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Revert to original text
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>

      {/* Revert confirmation overlay */}
      {showRevertConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg max-w-sm mx-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Revert to original text? This will permanently replace the rephrased version.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevertConfirm(false)}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevert}
              >
                <Check className="h-3 w-3 mr-1" />
                Revert
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Highlighted rephrased text with conditional content */}
      <span className={cn(
        "transition-all duration-200 inline-block",
        !showOriginal && "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-300 dark:border-blue-700 pl-2 rounded-r"
      )}>
        {showOriginal ? (
          <span className="text-gray-600 dark:text-gray-400 italic">
            {originalText}
          </span>
        ) : (
          <span>
            {rephrasedText}
          </span>
        )}
      </span>
    </span>
  )
} 