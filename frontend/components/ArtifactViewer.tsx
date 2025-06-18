"use client"

import { useState, useEffect } from "react"
import { useArtifactStore, type Artifact, type ArtifactVersion } from "@/frontend/stores/ArtifactStore"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"
import { ScrollArea } from "@/frontend/components/ui/scroll-area"
import { Download, Copy, Pin, Archive, History, Code, FileText, Calendar, Tag, RotateCcw, Eye } from "lucide-react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import MarkdownRenderer from "@/frontend/components/MemoizedMarkdown"

interface ArtifactViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifact: Artifact
}

export function ArtifactViewer({ open, onOpenChange, artifact }: ArtifactViewerProps) {
  const {
    downloadArtifact,
    pinArtifact,
    archiveArtifact,
    updateArtifact,
    fetchArtifactVersions,
    restoreArtifactVersion,
    downloadArtifactVersion,
    artifactVersions,
  } = useArtifactStore()

  const [activeTab, setActiveTab] = useState("content")
  const [versions, setVersions] = useState<ArtifactVersion[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [selectedVersionContent, setSelectedVersionContent] = useState<string | null>(null)

  // Fetch versions when the dialog opens or artifact changes
  useEffect(() => {
    if (open && artifact) {
      loadVersions()
    }
  }, [open, artifact])

  const loadVersions = async () => {
    if (!artifact) return

    setIsLoadingVersions(true)
    try {
      const fetchedVersions = await fetchArtifactVersions(artifact.id)
      setVersions(fetchedVersions)
    } catch (error) {
      console.error("Error loading versions:", error)
      toast.error("Failed to load version history")
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!artifact) return

    try {
      const version = versions.find((v) => v.id === versionId)
      await restoreArtifactVersion(artifact.id, versionId)
      toast.success(`Restored to version ${version?.version || "unknown"}`)
      await loadVersions() // Reload versions
    } catch (error) {
      console.error("Error restoring version:", error)
      toast.error("Failed to restore version")
    }
  }

  const handleDownloadVersion = async (versionId: string) => {
    if (!artifact) return

    try {
      await downloadArtifactVersion(artifact.id, versionId)
      toast.success("Version downloaded successfully")
    } catch (error) {
      console.error("Error downloading version:", error)
      toast.error("Failed to download version")
    }
  }

  const handleViewVersion = (content: string) => {
    setSelectedVersionContent(content)
    setActiveTab("content")
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content)
      toast.success("Content copied to clipboard!")
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

  const handleArchive = async () => {
    try {
      await archiveArtifact(artifact.id)
      toast.success("Artifact archived!")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to archive artifact")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
      case "markdown":
      case "md":
        return "markdown"
      default:
        return "text"
    }
  }

  const renderContent = () => {
    const language = getLanguageForHighlighting()
    const contentToRender = selectedVersionContent || artifact.content

    // Enhanced detection for markdown/table content
    const isMarkdownContent = 
      artifact.content_type === "markdown" || 
      artifact.content_type === "md" || 
      artifact.content_type === "data" || 
      artifact.content_type === "table" ||
      // Also detect if content looks like markdown table
      (artifact.content.includes('|') && artifact.content.includes('---'))

    if (isMarkdownContent) {
      return (
        <div className="space-y-4">
          {selectedVersionContent && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Viewing previous version</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVersionContent(null)}
                className="ml-auto h-6 text-xs"
              >
                Back to current
              </Button>
            </div>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none w-full prose-table:border-collapse prose-table:border prose-table:border-border prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-2 sm:prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-td:border prose-td:border-border prose-td:px-2 sm:prose-td:px-4 prose-td:py-2 prose-tr:border-b prose-tr:border-border prose-table:w-full prose-table:rounded-md prose-table:shadow-sm">
            <div className="overflow-x-auto max-w-full">
              <MarkdownRenderer 
                content={contentToRender} 
                id={`artifact-${artifact.id}`} 
                threadId={artifact.thread_id || ""}
                messageId={artifact.message_id || ""}
                isArtifactMessage={true}
              />
            </div>
          </div>
        </div>
      )
    }

    if (language !== "text" && artifact.content_type !== "text") {
      return (
        <div className="space-y-4">
          {selectedVersionContent && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Viewing previous version</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVersionContent(null)}
                className="ml-auto h-6 text-xs"
              >
                Back to current
              </Button>
            </div>
          )}
          <div className="w-full">
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                width: "100%",
                overflowX: "auto",
                maxWidth: "100%",
              }}
              showLineNumbers
              wrapLines={false}
              wrapLongLines={false}
            >
              {contentToRender}
            </SyntaxHighlighter>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {selectedVersionContent && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Eye className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-600 dark:text-blue-400">Viewing previous version</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVersionContent(null)}
              className="ml-auto h-6 text-xs"
            >
              Back to current
            </Button>
          </div>
        )}
        <div className="w-full">
          <pre className="whitespace-pre-wrap text-sm bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto max-w-full break-words">{contentToRender}</pre>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (artifact?.id) {
      // Add debugging function to window for manual artifact fixing
      (window as any).fixArtifact = async (newTitle?: string, newContentType?: string) => {
        try {
          console.log(`🔧 Fixing artifact ${artifact.id}...`)
          
          // If no title provided, try to generate a smart one from content
          let titleToUse = newTitle
          if (!titleToUse && artifact.content.includes('|') && artifact.content.includes('---')) {
            const firstLine = artifact.content.split('\n').find(line => line.trim() && !line.includes('|'))
            titleToUse = firstLine?.replace(/[#*_]/g, '').trim() || 'Requirements Table'
          }
          
          // If no content type provided, detect from content
          let contentTypeToUse = newContentType
          if (!contentTypeToUse && artifact.content.includes('|') && artifact.content.includes('---')) {
            contentTypeToUse = 'data'
          }
          
          await updateArtifact(artifact.id, { 
            title: titleToUse || artifact.title,
            content_type: contentTypeToUse || artifact.content_type
          })
          
          console.log(`✅ Fixed artifact: "${titleToUse}" (${contentTypeToUse})`)
          
        } catch (error) {
          console.error('❌ Failed to fix artifact:', error)
        }
      }
    }
    
    return () => {
      // Cleanup
      delete (window as any).fixArtifact
    }
  }, [artifact?.id, updateArtifact])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[1400px] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0 sm:w-[95vw] sm:h-[85vh]">
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {artifact.content_type === "code" ||
              ["javascript", "typescript", "python", "html", "css"].includes(artifact.content_type) ? (
                <Code className="h-5 w-5 text-primary flex-shrink-0" />
              ) : (
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg truncate">{artifact.title}</DialogTitle>
                {artifact.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{artifact.description}</p>
                )}
              </div>
              {artifact.is_pinned && <Pin className="h-4 w-4 text-primary flex-shrink-0" />}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleCopy} className="flex-shrink-0">
              <Copy className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="flex-shrink-0">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePin} className="flex-shrink-0">
              <Pin className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{artifact.is_pinned ? "Unpin" : "Pin"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchive} className="flex-shrink-0">
              <Archive className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Archive</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="flex justify-center px-4 sm:px-6 mt-4">
              <TabsList className="grid grid-cols-3 flex-shrink-0 w-full max-w-md">
                <TabsTrigger value="content" className="text-xs sm:text-sm">Content</TabsTrigger>
                <TabsTrigger value="metadata" className="text-xs sm:text-sm">Details</TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="content" className="flex-1 overflow-hidden mt-4 mx-4 sm:mx-6 mb-4 sm:mb-6">
              <div className="h-full w-full overflow-auto">{renderContent()}</div>
            </TabsContent>

            <TabsContent value="metadata" className="flex-1 overflow-hidden mt-4 mx-4 sm:mx-6 mb-4 sm:mb-6">
              <ScrollArea className="h-full w-full">
                <div className="space-y-6 pr-4">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Content Type:</span>
                        <p className="font-medium">{artifact.content_type}</p>
                      </div>
                      {artifact.language && (
                        <div>
                          <span className="text-muted-foreground">Language:</span>
                          <p className="font-medium">{artifact.language}</p>
                        </div>
                      )}
                      {artifact.file_extension && (
                        <div>
                          <span className="text-muted-foreground">File Extension:</span>
                          <p className="font-medium">{artifact.file_extension}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <p className="font-medium">v{artifact.version}</p>
                      </div>
                      {artifact.project_name && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground">Project:</span>
                          <p className="font-medium flex items-center gap-1">📁 {artifact.project_name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timestamps
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p className="font-medium">{formatDate(artifact.created_at)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span>
                        <p className="font-medium">{formatDate(artifact.updated_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {artifact.tags.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {artifact.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Stats */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Content Statistics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Characters:</span>
                        <p className="font-medium">{artifact.content.length.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lines:</span>
                        <p className="font-medium">{artifact.content.split("\n").length.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Words:</span>
                        <p className="font-medium">
                          {artifact.content
                            .split(/\s+/)
                            .filter((word) => word.length > 0)
                            .length.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Size:</span>
                        <p className="font-medium">{(new Blob([artifact.content]).size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden mt-4 mx-4 sm:mx-6 mb-4 sm:mb-6">
              <ScrollArea className="h-full w-full">
                <div className="space-y-4 pr-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <History className="h-4 w-4" />
                      Version History
                    </div>
                    <Button variant="outline" size="sm" onClick={loadVersions} disabled={isLoadingVersions}>
                      {isLoadingVersions ? "Loading..." : "Refresh"}
                    </Button>
                  </div>

                  {isLoadingVersions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Current Version */}
                      <div className="border rounded-lg p-4 bg-primary/5 border-primary/20">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Version {artifact.version}</span>
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">{formatDate(artifact.updated_at)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {artifact.content.length} characters, {artifact.content.split("\n").length} lines
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedVersionContent(null)}
                              className="h-7 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Previous Versions */}
                      {versions.length > 0 ? (
                        versions.map((version) => (
                          <div key={version.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Version {version.version}</span>
                                {version.metadata?.change_description && (
                                  <span className="text-xs text-muted-foreground">
                                    - {version.metadata.change_description}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">{formatDate(version.created_at)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                {version.content.length} characters, {version.content.split("\n").length} lines
                              </p>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewVersion(version.content)}
                                  className="h-7 text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">View</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadVersion(version.id)}
                                  className="h-7 text-xs"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">Download</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRestoreVersion(version.id)}
                                  className="h-7 text-xs text-orange-600 hover:text-orange-700"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">Restore</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                                                ))
                       ) : (
                          <div className="text-center py-8">
                            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No version history</h3>
                            <p className="text-muted-foreground">
                              This artifact hasn't been updated yet. Version history will appear here when changes are
                              made.
                            </p>
                          </div>
                       )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
