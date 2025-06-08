"use client"

import { useState } from "react"
import { ExternalLink, ChevronDown, ChevronUp, Globe2 } from "lucide-react"
import { Button } from "./ui/button"

interface Source {
  title?: string
  url?: string
  snippet?: string
  publishedDate?: string
}

interface MessageSourcesProps {
  sources: Source[]
}

export default function MessageSources({ sources }: MessageSourcesProps) {
  const [expanded, setExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  const validSources = sources.filter((source) => source.url)
  if (validSources.length === 0) return null

  return (
    <div className="w-full mt-3">
      {/* Enhanced sources header with visual indicators */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-xs text-blue-700 dark:text-blue-300">
          <Globe2 className="h-3 w-3" />
          <span className="font-medium">Web Sources</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-6 px-2"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide" : "Show"} {validSources.length} source{validSources.length !== 1 ? "s" : ""}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          {validSources.map((source, index) => (
            <div
              key={index}
              className="space-y-1.5 pb-2 last:pb-0 border-b border-blue-200 dark:border-blue-700 last:border-b-0"
            >
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 font-medium hover:underline text-blue-600 dark:text-blue-400 text-sm leading-tight"
              >
                <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{source.title || source.url}</span>
              </a>
              {source.snippet && (
                <p className="text-xs text-muted-foreground line-clamp-3 ml-5 leading-relaxed">{source.snippet}</p>
              )}
              {source.publishedDate && (
                <p className="text-xs text-blue-600 dark:text-blue-400 ml-5 font-medium">
                  {new Date(source.publishedDate).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
