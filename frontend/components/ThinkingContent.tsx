"use client"

import { Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "./ui/button"

interface ThinkingContentProps {
  reasoning: string
  isExpanded: boolean
}

export function ThinkingContent({ reasoning, isExpanded }: ThinkingContentProps) {
  const [copied, setCopied] = useState(false)

  if (!reasoning || !isExpanded) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(reasoning)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        "relative mb-4 overflow-hidden transition-all duration-300",
        "rounded-lg border border-purple-200 dark:border-purple-800",
        "bg-gradient-to-r from-purple-50 to-indigo-50",
        "dark:from-purple-950/30 dark:to-indigo-950/30",
      )}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-purple-100/80 dark:bg-purple-900/30">
        <div className="text-xs font-medium text-purple-800 dark:text-purple-300">Model's thinking process</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0.5 text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-200"
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy thinking</span>
        </Button>
      </div>
      <div className="p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">{reasoning}</div>
      <div className="px-3 py-1.5 text-xs text-purple-700 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-900/20">
        This is the model's internal reasoning process, not part of the response.
      </div>
    </div>
  )
}
