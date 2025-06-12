"use client"

import { Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface ThinkingIndicatorProps {
  isVisible: boolean
}

export function ThinkingIndicator({ isVisible }: ThinkingIndicatorProps) {
  const [dots, setDots] = useState("...")

  // Animate the dots
  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "."
        if (prev === ".") return ".."
        if (prev === "..") return "..."
        return "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-purple-100 dark:bg-purple-900/30",
        "text-purple-800 dark:text-purple-300",
        "border border-purple-200 dark:border-purple-800",
        "shadow-sm transition-all duration-300",
        "animate-pulse",
      )}
    >
      <Brain className="h-4 w-4" />
      <span className="text-sm font-medium">Thinking{dots}</span>
    </div>
  )
}
