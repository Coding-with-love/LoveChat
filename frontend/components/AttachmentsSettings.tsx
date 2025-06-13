"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Download, Trash2, FileText, AlertTriangle, Loader2, File, Search, Filter } from 'lucide-react'
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
import { Separator } from "./ui/separator"
import { ScrollArea } from "./ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import FileTypeIcon from "./FileTypeIcon"
import { formatFileSize } from "@/lib/supabase/file-upload"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"

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
          file.file_type.toLowerCase().includes(query)
      )
    }

    // Apply file type filter
    if (fileTypeFilter !== "all") {
      result = result.filter((file) => {
        if (fileTypeFilter === "image") return file.file_type.startsWith("image/")
        if (fileTypeFilter === "document") return file.file_type === "application/pdf" || file.file_type.includes("document")
        if (fileTypeFilter === "code") return file.file_type.startsWith("text/") || file.file_type.includes("javascript") || file.file_type.includes("json")
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

  const renderFileCard = (file: FileAttachment) => (
    <div
      key={file.id}
      className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-4 hover:shadow-lg transition-all duration-300 hover:border-primary/20"
    >
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-center">
          <FileTypeIcon mimeType={file.file_type} className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate text-foreground group-hover:text-primary transition-colors">
            {file.file_name}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {getFileTypeLabel(file.file_type)}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
            </span>
          </div>
          {file.thread_title && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              Thread: {file.thread_title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 w-8 p-0 hover:bg-primary/10"
          >
            <a href={file.file_url} target="_blank" rel="noopener noreferrer" download={file.file_name}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isDeleting[file.id]}
              >
                {isDeleting[file.id] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete File?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the file "{file.file_name}" from your storage.
                  <br />
                  <br />
                  <strong>
                    Note: This will remove the file from the thread, but not delete the thread itself. 
                    This may lead to unexpected behavior if the file is referenced in messages.
                  </strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteFile(file.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete File
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
              <File className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">File Attachments</CardTitle>
              <CardDescription>Manage your uploaded files and attachments</CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {files.length} files ({formatFileSize(totalSize)})
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Important Note</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Deleting files here will remove them from the relevant threads, but not delete the threads.
                This may lead to unexpected behavior if you delete a file that is still being referenced in a thread.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files by name, type, or thread..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="w-40">
            <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
              <SelectTrigger>
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
              <SelectTrigger>
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

      {/* Files List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Files</TabsTrigger>
          <TabsTrigger value="by-thread">By Thread</TabsTrigger>
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
              <div className="space-y-3">
                {filteredFiles.map((file) => renderFileCard(file))}
              </div>
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
                  <div key={thread.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium">{thread.title}</h3>
                      <Badge variant="outline">{thread.files.length} files</Badge>
                    </div>
                    <div className="space-y-3 pl-4 border-l-2 border-muted">
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
