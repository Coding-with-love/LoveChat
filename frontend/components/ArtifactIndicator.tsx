"use client"

import { useState, useEffect } from "react"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import { Badge } from "@/frontend/components/ui/badge"
import { Button } from "@/frontend/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/frontend/components/ui/tooltip"
import { Package, Archive, Pin, Code, FileText, Star } from 'lucide-react'
import { cn } from "@/lib/utils"

interface ArtifactIndicatorProps {
  messageId: string
  threadId?: string
  className?: string
  variant?: "badge" | "icon" | "minimal"
  showCount?: boolean
  onClick?: () => void
}

export function ArtifactIndicator({ 
  messageId, 
  threadId, 
  className, 
  variant = "badge",
  showCount = true,
  onClick 
}: ArtifactIndicatorProps) {
  const { getArtifactsByMessageId } = useArtifactStore()
  const [artifacts, setArtifacts] = useState<any[]>([])

  useEffect(() => {
    const messageArtifacts = getArtifactsByMessageId(messageId)
    setArtifacts(messageArtifacts)
  }, [messageId, getArtifactsByMessageId])

  if (artifacts.length === 0) {
    return null
  }

  const pinnedCount = artifacts.filter(a => a.is_pinned).length
  const codeArtifacts = artifacts.filter(a => 
    ['code', 'javascript', 'typescript', 'python', 'html', 'css'].includes(a.content_type)
  ).length
  const textArtifacts = artifacts.length - codeArtifacts

  const getArtifactIcon = (contentType: string) => {
    switch (contentType) {
      case "code":
      case "javascript":
      case "typescript":
      case "python":
        return <Code className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const renderMinimal = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
                     <div className={cn("flex items-center gap-1 cursor-help", className)}>
             <Package className="w-3 h-3 text-primary hover:text-primary/80 transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">Created as artifact{artifacts.length > 1 ? 's' : ''}</p>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {artifacts.map((artifact) => (
                <div key={artifact.id}>"{artifact.title}"</div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  const renderIcon = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "p-1 bg-primary/10 border border-primary/30 rounded-full shadow-sm hover:shadow-md transition-all duration-200 cursor-help",
              className
            )}
            onClick={onClick}
          >
            <Package className="w-3 h-3 text-primary hover:text-primary/80 transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">Created as artifact{artifacts.length > 1 ? 's' : ''}</p>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {artifacts.map((artifact) => (
                <div key={artifact.id}>"{artifact.title}"</div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  const renderBadge = () => (
    <Badge 
      variant="secondary" 
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <Package className="h-3 w-3 text-primary" />
      {showCount && (
        <span className="text-primary font-medium">
          {artifacts.length}
        </span>
      )}
      <span className="text-muted-foreground">
        artifact{artifacts.length > 1 ? 's' : ''}
      </span>
      {pinnedCount > 0 && (
        <Pin className="h-2 w-2 text-yellow-500 fill-current" />
      )}
    </Badge>
  )

  switch (variant) {
    case "minimal":
      return renderMinimal()
    case "icon":
      return renderIcon()
    case "badge":
    default:
      return renderBadge()
  }
}

// Component to show artifacts in a message header/footer
export function MessageArtifactSummary({ 
  messageId, 
  className 
}: { 
  messageId: string
  className?: string 
}) {
  const { getArtifactsByMessageId } = useArtifactStore()
  const [artifacts, setArtifacts] = useState<any[]>([])

  useEffect(() => {
    const messageArtifacts = getArtifactsByMessageId(messageId)
    setArtifacts(messageArtifacts)
  }, [messageId, getArtifactsByMessageId])

  if (artifacts.length === 0) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap gap-1 mt-2", className)}>
      {artifacts.slice(0, 3).map((artifact) => (
        <Badge
          key={artifact.id}
          variant="outline"
          className="flex items-center gap-1 px-1 py-0.5 text-xs border-primary/30 bg-primary/5"
        >
          {artifact.content_type === 'code' ? (
            <Code className="h-2 w-2" />
          ) : (
            <FileText className="h-2 w-2" />
          )}
          <span className="max-w-[60px] truncate">{artifact.title}</span>
          {artifact.is_pinned && (
            <Pin className="h-2 w-2 text-yellow-500 fill-current" />
          )}
        </Badge>
      ))}
      {artifacts.length > 3 && (
        <Badge variant="outline" className="px-1 py-0.5 text-xs">
          +{artifacts.length - 3} more
        </Badge>
      )}
    </div>
  )
} 