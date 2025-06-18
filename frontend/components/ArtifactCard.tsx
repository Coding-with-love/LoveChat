"use client"

import { useState } from "react"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/frontend/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/frontend/components/ui/tooltip"
import {
  Code,
  FileText,
  Download,
  Copy,
  Link,
  Pin,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import type { Artifact } from "@/frontend/stores/ArtifactStore"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import MarkdownRenderer from "@/frontend/components/MemoizedMarkdown"

interface ArtifactCardProps {
  artifact: Artifact
  onReference?: (artifact: Artifact) => void
  onViewInGallery?: (artifact: Artifact) => void
  className?: string
  compact?: boolean
}

export function ArtifactCard({
  artifact,
  onReference,
  onViewInGallery,
  className,
  compact = false,
}: ArtifactCardProps) {
  const { downloadArtifact, pinArtifact, deleteArtifact } = useArtifactStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)

  const getArtifactIcon = () => {
    switch (artifact.content_type) {
      case "code":
      case "javascript":
      case "typescript":
      case "python":
      case "html":
      case "css":
        return <Code className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getArtifactTypeColor = () => {
    switch (artifact.content_type) {
      case "code":
      case "javascript":
      case "typescript":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
      case "python":
        return "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
      case "html":
      case "css":
        return "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
      case "markdown":
        return "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800"
      default:
        return "bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800"
    }
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
      toast.success("Artifact content copied to clipboard!")
    } catch (error) {
      toast.error("Failed to copy content")
    }
  }

  const handleDownload = async () => {
    try {
      await downloadArtifact(artifact.id)
      toast.success("Artifact downloaded!")
    } catch (error) {
      toast.error("Failed to download artifact")
    }
  }

  const handlePin = async () => {
    try {
      await pinArtifact(artifact.id)
      toast.success(artifact.is_pinned ? "Artifact unpinned" : "Artifact pinned!")
    } catch (error) {
      toast.error("Failed to update artifact")
    }
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${artifact.title}"?`)) {
      try {
        await deleteArtifact(artifact.id)
        toast.success("Artifact deleted")
      } catch (error) {
        toast.error("Failed to delete artifact")
      }
    }
  }

  const handleReference = () => {
    const referenceText = `[Artifact: ${artifact.title}](artifact://${artifact.id})`

    // Emit custom event for chat input to pick up
    const event = new CustomEvent("artifactReference", {
      detail: { reference: referenceText, artifact },
    })
    window.dispatchEvent(event)

    if (onReference) {
      onReference(artifact)
    }

    toast.success("Artifact reference added to chat input!")
  }

  const handleViewInGallery = () => {
    if (onViewInGallery) {
      onViewInGallery(artifact)
    }
  }

  const previewContent = () => {
    const maxLines = compact ? 5 : isExpanded ? Number.POSITIVE_INFINITY : 10
    const lines = artifact.content.split("\n")
    const shouldTruncate = lines.length > maxLines
    const displayContent =
      shouldTruncate && !isExpanded ? lines.slice(0, maxLines).join("\n") + "\n..." : artifact.content

    // Always use MemoizedMarkdown for consistent rendering
    // This handles tables, math, code blocks, and plain text properly
    return (
      <div className="bg-muted/50 rounded-lg p-3 overflow-auto">
        <div className={cn(
          "prose dark:prose-invert max-w-none",
          compact ? "prose-xs" : "prose-sm",
          // Table styling
          "prose-table:text-xs prose-table:border-collapse prose-table:border prose-table:border-border prose-table:w-full prose-table:rounded prose-table:shadow-sm prose-table:my-2",
          "prose-th:border prose-th:border-border prose-th:bg-muted/30 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:text-xs",
          "prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-xs prose-td:align-top",
          "prose-tr:border-b prose-tr:border-border",
          // Code styling
          "prose-code:text-xs prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:border prose-code:border-border/50",
          "prose-pre:text-xs prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded prose-pre:overflow-x-auto prose-pre:border prose-pre:border-border/50",
          // Text styling
          "prose-p:text-xs prose-p:leading-relaxed prose-p:my-1.5",
          "prose-h1:text-sm prose-h1:font-semibold prose-h1:my-2 prose-h1:text-foreground",
          "prose-h2:text-sm prose-h2:font-medium prose-h2:my-1.5 prose-h2:text-foreground",
          "prose-h3:text-xs prose-h3:font-medium prose-h3:my-1 prose-h3:text-foreground",
          // List styling
          "prose-ul:text-xs prose-ul:my-1.5 prose-li:my-0.5 prose-li:text-xs",
          "prose-ol:text-xs prose-ol:my-1.5",
          // Math styling
          "prose-strong:text-xs prose-strong:font-medium",
          "prose-em:text-xs",
          // Blockquote styling
          "prose-blockquote:text-xs prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-3 prose-blockquote:my-2 prose-blockquote:italic",
        )}>
          <MarkdownRenderer 
            content={displayContent} 
            id={`artifact-preview-${artifact.id}`} 
            threadId={artifact.thread_id || ""}
            messageId={artifact.message_id || ""}
            isArtifactMessage={true}
          />
        </div>
      </div>
    )
  }

  const shouldShowExpandButton = artifact.content.split("\n").length > (compact ? 5 : 10)

  const getArtifactEmoji = () => {
    switch (artifact.content_type) {
      case "table":
        return "📊"
      case "text":
        return "🧾"
      case "code":
        return "💾"
      case "markdown":
        return "📄"
      default:
        return "📄"
    }
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-2 w-full overflow-hidden",
        getArtifactTypeColor(),
        isHovered && "shadow-md transform scale-[1.01]",
        compact && "max-w-md",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between overflow-hidden">
          <div className="flex items-start gap-3 flex-1 min-w-0 overflow-hidden">
            {/* Artifact Badge */}
            <div className="flex items-center gap-2 mt-1 flex-shrink-0">
              <div className="p-1.5 rounded-md bg-background/80 border">
                <Package className="h-3 w-3 text-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <div className="flex-shrink-0">
                  {getArtifactIcon()}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h3 className="font-semibold text-sm truncate cursor-help block" title={artifact.title}>
                          {artifact.title}
                        </h3>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm break-words">{artifact.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    .{artifact.file_extension}
                  </span>
                  {artifact.is_pinned && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Pin className="h-3 w-3 text-primary fill-current cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>Pinned</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {artifact.content_type}
                </Badge>
                {artifact.language && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {artifact.language}
                  </Badge>
                )}
                {artifact.project_name && (
                  <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700 flex-shrink-0 max-w-[120px] overflow-hidden">
                    <span className="truncate block w-full" title={`📁 ${artifact.project_name}`}>
                      📁 {artifact.project_name}
                    </span>
                  </Badge>
                )}
              </div>

              {artifact.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2 break-words overflow-hidden">
                  {artifact.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Calendar className="h-3 w-3" />
                  {formatDate(artifact.created_at)}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span>{artifact.content.length} chars</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span>v{artifact.version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Content Preview */}
        <div className="mb-4">
          {previewContent()}

          {shouldShowExpandButton && (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="mt-2 h-6 text-xs">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show More
                </>
              )}
            </Button>
          )}
        </div>

        {/* Action Bar */}
        <div
          className={cn(
            "flex items-center gap-1 transition-opacity duration-200",
            compact ? "opacity-100" : isHovered ? "opacity-100" : "opacity-60",
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy to clipboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 px-2">
                  <Download className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleReference} className="h-7 px-2">
                  <Link className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reference in chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handlePin} className="h-7 px-2">
                  <Pin className={cn("h-3 w-3", artifact.is_pinned && "fill-current text-primary")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{artifact.is_pinned ? "Unpin" : "Pin"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleViewInGallery} className="h-7 px-2">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View in gallery</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex-1" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-7 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete artifact</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {artifact.tags && artifact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {artifact.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">
                {tag}
              </Badge>
            ))}
            {artifact.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                +{artifact.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
