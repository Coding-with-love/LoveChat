"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Download, Trash2, Loader2, File, Search, Paperclip, Info } from "lucide-react"
import { toast } from "sonner"
import { getAllFileAttachments, deleteFileAttachment } from "@/lib/supabase/queries"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import FileTypeIcon from "./FileTypeIcon"
import { formatFileSize } from "@/lib/supabase/file-upload"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/frontend/components/ui/tooltip"
import { useTabVisibility } from "@/frontend/hooks/useTabVisibility"

interface FileAttachment {
  id: string
  message_id: string
  thread_id: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  thumbnail_url?: string
  created_at: string
  thread_title?: string
}

interface ThreadWithFiles {
  id: string
  title: string
  files: FileAttachment[]
}

export default function AttachmentsSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [files, setFiles] = useState<FileAttachment[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileAttachment[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<string>("newest")
  const [threadGroups, setThreadGroups] = useState<ThreadWithFiles[]>([])
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({})
  const [totalSize, setTotalSize] = useState(0)

  // Add tab visibility management to prevent stuck loading states
  useTabVisibility({
    onVisible: () => {
      console.log("🔄 AttachmentsSettings became visible, checking loading state:", isLoading)
      
      // More aggressive clearing of stuck loading states
      if (isLoading) {
        console.log("🔄 Found loading state in AttachmentsSettings, setting up timeout...")
        setTimeout(() => {
          if (isLoading) {
            console.warn("⚠️ Force clearing stuck loading state in AttachmentsSettings after tab return")
            setIsLoading(false)
            // If we have no files loaded, try to load them once more
            if (files.length === 0) {
              console.log("🔄 Retrying file load after clearing stuck state")
              loadFiles()
            }
          }
        }, 1000) // Only wait 1 second before force clearing
      }
    },
    refreshStoresOnVisible: false, // Don't trigger additional refreshes
  })

  // Add a safety timeout to prevent infinite loading screens
  useEffect(() => {
    if (isLoading) {
      const safetyTimeout = setTimeout(() => {
        if (isLoading) {
          console.warn("⚠️ Safety timeout: forcing AttachmentsSettings out of loading state")
          setIsLoading(false)
        }
      }, 15000) // 15 second safety timeout for file loading

      return () => clearTimeout(safetyTimeout)
    }
  }, [isLoading])

  useEffect(() => {
    loadFiles()
  }, [])

  useEffect(() => {
    // Apply filters and sorting
    let result = [...files]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (file) =>
          file.file_name.toLowerCase().includes(query) ||
          file.thread_title?.toLowerCase().includes(query) ||
          file.file_type.toLowerCase().includes(query),
      )
    }

    // Apply file type filter
    if (fileTypeFilter !== "all") {
      result = result.filter((file) => {
        if (fileTypeFilter === "image") return file.file_type.startsWith("image/")
        if (fileTypeFilter === "document")
          return file.file_type === "application/pdf" || file.file_type.includes("document")
        if (fileTypeFilter === "code")
          return (
            file.file_type.startsWith("text/") ||
            file.file_type.includes("javascript") ||
            file.file_type.includes("json")
          )
        if (fileTypeFilter === "other") {
          return !(
            file.file_type.startsWith("image/") ||
            file.file_type === "application/pdf" ||
            file.file_type.includes("document") ||
            file.file_type.startsWith("text/") ||
            file.file_type.includes("javascript") ||
            file.file_type.includes("json")
          )
        }
        return true
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortOrder === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortOrder === "name") {
        return a.file_name.localeCompare(b.file_name)
      } else if (sortOrder === "size") {
        return b.file_size - a.file_size
      }
      return 0
    })

    setFilteredFiles(result)

    // Group files by thread
    const groups: Record<string, ThreadWithFiles> = {}
    result.forEach((file) => {
      if (!groups[file.thread_id]) {
        groups[file.thread_id] = {
          id: file.thread_id,
          title: file.thread_title || "Unknown Thread",
          files: [],
        }
      }
      groups[file.thread_id].files.push(file)
    })
    setThreadGroups(Object.values(groups))
  }, [files, searchQuery, fileTypeFilter, sortOrder])

  const loadFiles = async () => {
    try {
      setIsLoading(true)
      const attachments = await getAllFileAttachments()
      setFiles(attachments)

      // Calculate total size
      const total = attachments.reduce((sum, file) => sum + file.file_size, 0)
      setTotalSize(total)
    } catch (error) {
      console.error("Failed to load files:", error)
      toast.error("Failed to load your attachments")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      setIsDeleting((prev) => ({ ...prev, [fileId]: true }))
      await deleteFileAttachment(fileId)
      setFiles((prev) => prev.filter((file) => file.id !== fileId))
      toast.success("File deleted successfully")
    } catch (error) {
      console.error("Failed to delete file:", error)
      toast.error("Failed to delete file")
    } finally {
      setIsDeleting((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  const getFileTypeLabel = (fileType: string) => {
    if (fileType.startsWith("image/")) return "Image"
    if (fileType === "application/pdf") return "PDF"
    if (fileType.includes("document")) return "Document"
    if (fileType.startsWith("text/")) return "Text"
    if (fileType.includes("javascript") || fileType.includes("json")) return "Code"
    return fileType.split("/")[1] || fileType
  }

  const getSortDescription = (sortOrder: string) => {
    switch (sortOrder) {
      case "newest":
        return "Sorted by most recent upload"
      case "oldest":
        return "Sorted by oldest upload first"
      case "name":
        return "Sorted alphabetically by filename"
      case "size":
        return "Sorted by largest files first"
      default:
        return ""
    }
  }

  const renderFileCard = (file: FileAttachment) => (
    <TooltipProvider key={file.id}>
      <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5">
        <div className="flex items-start gap-4">
          {/* File Icon */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center group-hover:from-primary/10 group-hover:to-primary/5 transition-colors">
            <FileTypeIcon
              mimeType={file.file_type}
              className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors"
            />
          </div>

          {/* File Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <FileTypeIcon mimeType={file.file_type} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h4 className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                {file.file_name}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="text-xs font-medium">
                {getFileTypeLabel(file.file_type)}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">{formatFileSize(file.file_size)}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
              </span>
            </div>

            {file.thread_title && (
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 w-1 rounded-full bg-muted-foreground/40"></div>
                <p className="text-xs text-muted-foreground truncate">From: {file.thread_title}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 w-8 p-0 hover:bg-primary/10 hover:scale-110 transition-all"
                >
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer" download={file.file_name}>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download file</TooltipContent>
            </Tooltip>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-110 transition-all"
                      disabled={isDeleting[file.id]}
                    >
                      {isDeleting[file.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete file</TooltipContent>
              </Tooltip>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Remove File?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>This will permanently remove "{file.file_name}" from your storage.</p>
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Note:</strong> This will detach the file from chats but won't delete the chat itself. If
                        the chat references it, some content may appear incomplete.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep File</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteFile(file.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove File
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
                <Paperclip className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">File Attachments</CardTitle>
                <CardDescription>Manage your uploaded files and attachments</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm font-medium px-3 py-1 rounded-full">
              {files.length} files ({formatFileSize(totalSize)})
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/50 dark:border-blue-800/50">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">File Management</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Removing a file detaches it from chats but won't delete the chat itself. If the chat references it, some
                content may appear incomplete.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters Toolbar */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files by name, type, or thread..."
                  className="pl-9 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="w-40">
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger className="bg-background/50 border-border/50 hover:bg-background transition-colors">
                      <SelectValue placeholder="File type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="image">Images</SelectItem>
                      <SelectItem value="document">Documents</SelectItem>
                      <SelectItem value="code">Code & Text</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="bg-background/50 border-border/50 hover:bg-background transition-colors">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="size">Size (largest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sort description */}
            <div className="text-xs text-muted-foreground">{getSortDescription(sortOrder)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-muted/50 to-muted/30 p-1 rounded-lg">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 hover:bg-primary/10"
          >
            All Files
          </TabsTrigger>
          <TabsTrigger
            value="by-thread"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 hover:bg-primary/10"
          >
            By Thread
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading your files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mb-4">
                <File className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No files found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || fileTypeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "You haven't uploaded any files yet"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">{filteredFiles.map((file) => renderFileCard(file))}</div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="by-thread" className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading your files...</p>
            </div>
          ) : threadGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mb-4">
                <File className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No files found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || fileTypeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "You haven't uploaded any files yet"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-8">
                {threadGroups.map((thread) => (
                  <div key={thread.id} className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                      <h3 className="text-lg font-semibold text-foreground">{thread.title}</h3>
                      <Badge variant="outline" className="ml-auto">
                        {thread.files.length} files
                      </Badge>
                    </div>
                    <div className="space-y-4 pl-6 border-l-2 border-gradient-to-b from-primary/50 to-transparent">
                      {thread.files.map((file) => renderFileCard(file))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
