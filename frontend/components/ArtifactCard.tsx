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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useTheme } from "next-themes"
import type { Artifact } from "@/frontend/stores/ArtifactStore"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"

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
  const { theme } = useTheme()
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

  const getLanguageForHighlighting = () => {
    if (artifact.language) {
      return artifact.language.toLowerCase()
    }

    switch (artifact.content_type.toLowerCase()) {
      case "javascript":
      case "js":
        return "javascript"
      case "typescript":
      case "ts":
        return "typescript"
      case "python":
      case "py":
        return "python"
      case "html":
        return "html"
      case "css":
        return "css"
      case "json":
        return "json"
      case "sql":
        return "sql"
      case "yaml":
      case "yml":
        return "yaml"
      case "xml":
        return "xml"
      default:
        return "text"
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
    const language = getLanguageForHighlighting()
    const maxLines = compact ? 5 : isExpanded ? Number.POSITIVE_INFINITY : 10
    const lines = artifact.content.split("\n")
    const shouldTruncate = lines.length > maxLines
    const displayContent =
      shouldTruncate && !isExpanded ? lines.slice(0, maxLines).join("\n") + "\n..." : artifact.content

    if (language !== "text" && artifact.content_type !== "text") {
      return (
        <SyntaxHighlighter
          language={language}
          style={theme === "dark" ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
            fontSize: compact ? "0.75rem" : "0.875rem",
            maxHeight: compact ? "120px" : isExpanded ? "none" : "200px",
            overflow: "auto",
          }}
          showLineNumbers={!compact}
        >
          {displayContent}
        </SyntaxHighlighter>
      )
    }

    return (
      <pre
        className={cn(
          "whitespace-pre-wrap text-sm bg-muted/50 p-3 rounded-lg overflow-auto",
          compact ? "text-xs max-h-[120px]" : isExpanded ? "max-h-none" : "max-h-[200px]",
        )}
      >
        {displayContent}
      </pre>
    )
  }

  const shouldShowExpandButton = artifact.content.split("\n").length > (compact ? 5 : 10)

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-2",
        getArtifactTypeColor(),
        isHovered && "shadow-md transform scale-[1.01]",
        compact && "max-w-md",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Artifact Badge */}
            <div className="flex items-center gap-2 mt-1">
              <div className="p-1.5 rounded-md bg-background/80 border">
                <Package className="h-3 w-3 text-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getArtifactIcon()}
                <h3 className="font-semibold text-sm truncate">{artifact.title}</h3>
                {artifact.is_pinned && <Pin className="h-3 w-3 text-primary fill-current" />}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {artifact.content_type}
                </Badge>
                {artifact.language && (
                  <Badge variant="outline" className="text-xs">
                    {artifact.language}
                  </Badge>
                )}
                {artifact.project_name && (
                  <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700">
                    📁 {artifact.project_name}
                  </Badge>
                )}
              </div>

              {artifact.description && <p className="text-xs text-muted-foreground mb-2">{artifact.description}</p>}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(artifact.created_at)}
                </div>
                <div className="flex items-center gap-1">
                  <span>{artifact.content.length} chars</span>
                </div>
                <div className="flex items-center gap-1">
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

        {/* Tags */}
        {artifact.tags.length > 0 && (
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
