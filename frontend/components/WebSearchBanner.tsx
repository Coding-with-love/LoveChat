"use client"

import { Search, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface WebSearchBannerProps {
  className?: string
}

export default function WebSearchBanner({ className }: WebSearchBannerProps) {
  return (
    <div
      className={cn(
        "w-full mb-3 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 rounded-lg p-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="bg-blue-500 dark:bg-blue-600 rounded-full p-1.5">
          <Search className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-blue-800 dark:text-blue-200">Web Search Results</h4>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            This response includes real-time information from the web
          </p>
        </div>
        <Globe className="h-5 w-5 text-blue-500 dark:text-blue-400" />
      </div>
    </div>
  )
}