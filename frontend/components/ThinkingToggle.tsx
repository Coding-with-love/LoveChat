"use client"

import { Brain, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"

interface ThinkingToggleProps {
  isExpanded: boolean
  onToggle: () => void
  hasReasoning: boolean
}

export function ThinkingToggle({ isExpanded, onToggle, hasReasoning }: ThinkingToggleProps) {
  if (!hasReasoning) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        "text-purple-700 dark:text-purple-400",
        "hover:bg-purple-100 hover:text-purple-800",
        "dark:hover:bg-purple-900/30 dark:hover:text-purple-300",
        "transition-all duration-200",
        "rounded-md px-2 py-1 h-auto",
      )}
    >
      <Brain className="h-3.5 w-3.5" />
      <span>Thinking</span>
      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </Button>
  )
}
