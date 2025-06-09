"use client"

import { useEffect, useState } from "react"
import { Loader2, MessageSquare, CheckCircle } from "lucide-react"
import { Progress } from "./ui/progress"

interface GlobalResumingIndicatorProps {
  isResuming?: boolean
  resumeProgress?: number
  threadTitle?: string
}

export function GlobalResumingIndicator({
  isResuming = false,
  resumeProgress = 0,
  threadTitle = "Chat",
}: GlobalResumingIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    console.log("🎯 GlobalResumingIndicator props changed:", { isResuming, resumeProgress })

    if (isResuming) {
      console.log("🎯 Setting indicator visible because isResuming is true")
      setIsVisible(true)
      setShowSuccess(false)
      setShowDone(false)
    } else if (resumeProgress >= 100 && isVisible) {
      console.log("🎯 Showing done state")
      setShowDone(true)
      setShowSuccess(false)

      // Show "Done!" for 3 seconds so user can see it
      const timeout = setTimeout(() => {
        console.log("🎯 Hiding indicator after showing done state")
        setIsVisible(false)
        setShowDone(false)
        setShowSuccess(false)
      }, 3000)
      return () => clearTimeout(timeout)
    } else if (resumeProgress >= 95 && isVisible && !showDone) {
      console.log("🎯 Showing success state")
      setShowSuccess(true)
    } else if (!isResuming && resumeProgress === 0) {
      console.log("🎯 Hiding indicator - not resuming and no progress")
      setIsVisible(false)
      setShowSuccess(false)
      setShowDone(false)
    }
  }, [isResuming, resumeProgress, isVisible, showDone])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[280px]">
        <div className="flex items-center gap-2 mb-2">
          {showDone ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : showSuccess ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">
            {showDone
              ? `Done! "${threadTitle}" resumed`
              : showSuccess
                ? `Finishing "${threadTitle}"...`
                : `Resuming "${threadTitle}"`}
          </span>
        </div>

        {!showSuccess && !showDone && (
          <div className="space-y-1">
            <Progress value={resumeProgress} className="h-1" />
            <p className="text-xs text-muted-foreground">
              {resumeProgress < 30
                ? "Connecting..."
                : resumeProgress < 50
                  ? "Loading content..."
                  : "Streaming response..."}
            </p>
          </div>
        )}

        {showDone && <p className="text-xs text-green-600 font-medium">Your conversation is ready to view!</p>}
      </div>
    </div>
  )
}
