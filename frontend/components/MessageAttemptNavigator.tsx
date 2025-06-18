"use client"

import { Button } from "@/frontend/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageAttemptNavigatorProps {
  currentIndex: number
  totalAttempts: number
  onPrevious: () => void
  onNext: () => void
  className?: string
}

export default function MessageAttemptNavigator({
  currentIndex,
  totalAttempts,
  onPrevious,
  onNext,
  className,
}: MessageAttemptNavigatorProps) {
  if (totalAttempts <= 1) return null

  return (
    <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        className="h-6 w-6 p-0 hover:bg-accent/50"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      
      <span className="font-mono text-xs px-2 py-1 bg-muted/50 rounded-sm">
        {currentIndex + 1}/{totalAttempts}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={currentIndex === totalAttempts - 1}
        className="h-6 w-6 p-0 hover:bg-accent/50"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  )
} 