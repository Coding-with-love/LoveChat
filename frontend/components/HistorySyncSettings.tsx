"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Download, Upload, Trash2, FileText, AlertTriangle, CheckCircle, Loader2, Database, History, CloudUpload } from 'lucide-react'
import { toast } from "sonner"
import { 
  getThreads, 
  getMessagesByThreadId, 
  getFileAttachmentsByThreadId,
  deleteAllThreads,
  createThread,
  createMessage
} from "@/lib/supabase/queries"
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
import { v4 as uuidv4 } from "uuid"
import type { UIMessage } from "ai"

interface ExportData {
  version: string
  exportDate: string
  threads: Array<{
    id: string
    title: string
    created_at: string
    last_message_at: string
    project_id?: string
    messages: Array<{
      id: string
      content: string
      role: string
      parts?: any[]
      created_at: string
      user_id: string
    }>
    fileAttachments?: Array<{
      id: string
      file_name: string
      file_type: string
      file_size: number
      file_url: string
      thumbnail_url?: string
      created_at: string
    }>
  }>
}

export default function HistorySyncSettings() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [importStats, setImportStats] = useState<{
    threadsCount: number
    messagesCount: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportHistory = async () => {
    try {
      setIsExporting(true)
      toast.info("Preparing your chat history for export...")

      // Get all threads
      const threads = await getThreads(true) // Include archived threads

      // Get messages and file attachments for each thread
      const threadsWithData = await Promise.all(
        threads.map(async (thread) => {
          const [messages, fileAttachments] = await Promise.all([
            getMessagesByThreadId(thread.id),
            getFileAttachmentsByThreadId(thread.id)
          ])

          return {
            ...thread,
            messages,
            fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined
          }
        })
      )

      const exportData: ExportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        threads: threadsWithData
      }

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json"
      })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `lovechat-history-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Successfully exported ${threadsWithData.length} conversations with ${threadsWithData.reduce((acc, t) => acc + t.messages.length, 0)} messages`)
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Failed to export chat history")
    } finally {
      setIsExporting(false)
    }
  }

  const processImportFile = async (file: File) => {
    console.log("🚀 processImportFile started with file:", file.name)

    try {
      setIsImporting(true)
      toast.info("Importing chat history...")

      console.log("📖 Reading file content...")
      const text = await file.text()
      console.log("📄 File content length:", text.length)
      console.log("📄 File content preview:", text.substring(0, 200))
      
      console.log("🔍 Parsing JSON...")
      const importData = JSON.parse(text)
      console.log("✅ JSON parsed successfully:", Object.keys(importData))

      // Detect and handle different JSON formats
      let threads: any[] = []
      
      if (importData.version && importData.threads && Array.isArray(importData.threads)) {
        // LoveChat format
        threads = importData.threads
        console.log("📥 Detected LoveChat export format")
      } else if (Array.isArray(importData)) {
        // ChatGPT format (array of conversations)
        threads = importData.map((conversation: any) => ({
          id: conversation.id || uuidv4(),
          title: conversation.title || "Imported Chat",
          created_at: conversation.create_time ? new Date(conversation.create_time * 1000).toISOString() : new Date().toISOString(),
          last_message_at: conversation.update_time ? new Date(conversation.update_time * 1000).toISOString() : new Date().toISOString(),
          messages: conversation.mapping ? Object.values(conversation.mapping)
            .filter((node: any) => node.message && node.message.content && node.message.content.parts)
            .map((node: any) => ({
              id: node.id || uuidv4(),
              content: Array.isArray(node.message.content.parts) ? node.message.content.parts.join('\n') : '',
              role: node.message.author?.role || 'user',
              created_at: node.message.create_time ? new Date(node.message.create_time * 1000).toISOString() : new Date().toISOString(),
              user_id: 'imported'
            })) : []
        }))
        console.log("📥 Detected ChatGPT export format")
      } else if (importData.conversations && Array.isArray(importData.conversations)) {
        // Another common format
        threads = importData.conversations.map((conversation: any) => ({
          id: conversation.id || uuidv4(),
          title: conversation.title || conversation.name || "Imported Chat",
          created_at: conversation.created_at || conversation.createdAt || new Date().toISOString(),
          last_message_at: conversation.updated_at || conversation.updatedAt || new Date().toISOString(),
          messages: conversation.messages || []
        }))
        console.log("📥 Detected generic conversation format")
      } else {
        throw new Error("Unsupported file format. Please ensure your JSON file contains conversations in a supported format.")
      }

      if (threads.length === 0) {
        throw new Error("No conversations found in the JSON file")
      }

      let importedThreads = 0
      let importedMessages = 0
      let skippedThreads = 0

      // Import each thread
      for (const threadData of threads) {
        try {
          // Generate new IDs to avoid conflicts
          const newThreadId = uuidv4()
          
          console.log(`📥 Importing thread: ${threadData.title} (${threadData.messages?.length || 0} messages)`)
          
          // Create the thread
          await createThread(newThreadId, threadData.project_id)
          
          // Import messages if they exist
          if (threadData.messages && Array.isArray(threadData.messages)) {
            for (const messageData of threadData.messages) {
              try {
                const newMessageId = uuidv4()
                
                const uiMessage: UIMessage = {
                  id: newMessageId,
                  content: messageData.content || "",
                  role: messageData.role as "user" | "assistant" | "system",
                  parts: messageData.parts || [{ type: "text", text: messageData.content || "" }],
                  createdAt: messageData.created_at ? new Date(messageData.created_at) : new Date()
                }

                await createMessage(newThreadId, uiMessage)
                importedMessages++
              } catch (messageError) {
                console.error(`Failed to import message in thread ${threadData.title}:`, messageError)
                // Continue with other messages
              }
            }
          }

          // Update thread title after importing messages (if it's not "New Chat")
          if (threadData.title && threadData.title !== "New Chat") {
            try {
              const { updateThread } = await import("@/lib/supabase/queries")
              await updateThread(newThreadId, threadData.title)
              console.log(`✅ Updated thread title to: ${threadData.title}`)
            } catch (titleError) {
              console.error(`Failed to update thread title for ${threadData.title}:`, titleError)
              // Continue - title update failure is not critical
            }
          }

          importedThreads++
          console.log(`✅ Successfully imported thread: ${threadData.title}`)
        } catch (error) {
          console.error(`❌ Failed to import thread ${threadData.title}:`, error)
          skippedThreads++
          // Continue with other threads
        }
      }

      setImportStats({
        threadsCount: importedThreads,
        messagesCount: importedMessages
      })

      const successMessage = `Successfully imported ${importedThreads} conversations with ${importedMessages} messages`
      const warningMessage = skippedThreads > 0 ? ` (${skippedThreads} threads were skipped due to errors)` : ""
      
      toast.success(successMessage + warningMessage)
      
      if (skippedThreads > 0) {
        toast.warning(`${skippedThreads} threads were skipped due to import errors. Check the console for details.`)
      }
    } catch (error) {
      console.error("Import failed:", error)
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON file format. Please check that your file is valid JSON.")
      } else {
        toast.error(`Failed to import chat history: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportHistory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔍 handleImportHistory triggered")
    const file = event.target.files?.[0]
    if (!file) {
      console.log("❌ No file selected")
      return
    }
    
    console.log("📁 File selected:", file.name, file.size, file.type)
    await processImportFile(file)
    // Reset the file input
    event.target.value = ""
  }

  const handleDeleteAllHistory = async () => {
    try {
      setIsDeleting(true)
      toast.info("Deleting all chat history...")

      await deleteAllThreads()
      
      toast.success("All chat history has been deleted")
      setImportStats(null)
    } catch (error) {
      console.error("Delete failed:", error)
      toast.error("Failed to delete chat history")
    } finally {
      setIsDeleting(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    console.log("📂 File dropped")
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    console.log("📁 Dropped files:", files.map(f => ({ name: f.name, type: f.type, size: f.size })))
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'))
    
    if (jsonFile) {
      console.log("✅ Valid JSON file found:", jsonFile.name)
      processImportFile(jsonFile)
    } else {
      console.log("❌ No valid JSON file found")
      toast.error("Please drop a valid JSON file")
    }
  }, [])

  const handleFileButtonClick = () => {
    console.log("🖱️ Browse Files button clicked")
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-8">
      {/* Export Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Export Chat History</CardTitle>
              <CardDescription>Download your conversations as a JSON file for backup or sharing</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">JSON Format</p>
              <p className="text-xs text-muted-foreground">
                Includes all conversations, messages, and metadata in a structured format
              </p>
            </div>
            <Badge variant="secondary">Portable</Badge>
          </div>
          
          <Button 
            onClick={handleExportHistory} 
            disabled={isExporting}
            className="w-full gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? "Exporting..." : "Export Chat History"}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <Upload className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Import Chat History</CardTitle>
              <CardDescription>Upload a JSON file to import conversations from another device or backup</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Important Note</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Importing will NOT delete your existing messages. New conversations will be added alongside your current ones.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Supported Formats</p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                  <li>• LoveChat exports (.json)</li>
                  <li>• ChatGPT conversation exports</li>
                  <li>• Generic conversation JSON files</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="import-file">Import JSON File</Label>
            
            {/* Drag and Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-muted-foreground/25 hover:border-green-500/50'
              } ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CloudUpload className={`mx-auto h-12 w-12 mb-4 ${isDragOver ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragOver ? 'Drop your JSON file here' : 'Drag and drop your JSON file here'}
                </p>
                <p className="text-xs text-muted-foreground">or</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFileButtonClick}
                  disabled={isImporting}
                  className="mt-2"
                >
                  Browse Files
                </Button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportHistory}
                disabled={isImporting}
                className="hidden"
              />
            </div>
          </div>

          {importStats && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Last Import Successful</p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Imported {importStats.threadsCount} conversations with {importStats.messagesCount} messages
                </p>
              </div>
            </div>
          )}

          {isImporting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing import file...
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Delete Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20">
              <Database className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Manage Chat History</CardTitle>
              <CardDescription>Permanently delete all your conversations and messages</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Danger Zone</p>
              <p className="text-xs text-red-700 dark:text-red-300">
                This action cannot be undone. All your conversations, messages, and associated data will be permanently deleted.
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isDeleting ? "Deleting..." : "Delete All Chat History"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete All Chat History?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your conversations, messages, and associated data. 
                  This action cannot be undone.
                  <br /><br />
                  <strong>Consider exporting your data first if you want to keep a backup.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllHistory}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
