"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import {
  Download,
  Upload,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  History,
  CloudUpload,
  Archive,
  Lock,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import {
  getThreads,
  getMessagesByThreadId,
  getFileAttachmentsByThreadId,
  deleteAllThreads,
  createThread,
  createMessage,
} from "@/lib/supabase/queries"
import { supabase } from "@/lib/supabase/client"
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
import { Progress } from "./ui/progress"
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
  artifacts?: Array<{
    id: string
    user_id: string
    thread_id?: string
    message_id?: string
    title: string
    description?: string
    content: string
    content_type: string
    language?: string
    file_extension?: string
    tags: string[]
    metadata: Record<string, any>
    is_pinned: boolean
    is_archived: boolean
    version: number
    project_name?: string
    created_at: string
    updated_at: string
  }>
}

export default function HistorySyncSettings() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importStats, setImportStats] = useState<{
    threadsCount: number
    messagesCount: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Debug effect to check ref initialization
  useEffect(() => {
    console.log("🔍 Component mounted, fileInputRef.current:", fileInputRef.current)

    // Add a slight delay to check after DOM is fully rendered
    const timer = setTimeout(() => {
      console.log("🔍 After timeout, fileInputRef.current:", fileInputRef.current)
      if (fileInputRef.current) {
        console.log("✅ File input element found:", {
          id: fileInputRef.current.id,
          type: fileInputRef.current.type,
          accept: fileInputRef.current.accept,
          disabled: fileInputRef.current.disabled,
        })
      } else {
        console.error("❌ File input element not found!")
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const getAllArtifacts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.access_token) throw new Error("No access token")

      const response = await fetch("/api/artifacts", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch artifacts")
      }

      const { artifacts } = await response.json()
      return artifacts || []
    } catch (error) {
      console.error("Error fetching artifacts:", error)
      return []
    }
  }

  const handleExportHistory = async () => {
    try {
      setIsExporting(true)
      toast.info("Preparing your chat history for export...")

      // Get all threads and artifacts in parallel
      const [threads, artifacts] = await Promise.all([
        getThreads(true), // Include archived threads
        getAllArtifacts(),
      ])

      toast.info("Gathering messages and attachments...")

      // Get messages and file attachments for each thread
      const threadsWithData = await Promise.all(
        threads.map(async (thread) => {
          const [messages, fileAttachments] = await Promise.all([
            getMessagesByThreadId(thread.id),
            getFileAttachmentsByThreadId(thread.id),
          ])

          return {
            ...thread,
            messages,
            fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
          }
        }),
      )

      const exportData: ExportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        threads: threadsWithData,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
      }

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `lovechat-history-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const messageCount = threadsWithData.reduce((acc, t) => acc + t.messages.length, 0)
      const artifactCount = artifacts.length

      let successMessage = `Successfully exported ${threadsWithData.length} conversations with ${messageCount} messages`
      if (artifactCount > 0) {
        successMessage += ` and ${artifactCount} artifacts`
      }

      toast.success(successMessage)
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
      setUploadProgress(10)
      toast.info("Reading file content...")

      console.log("📖 Reading file content...")
      const text = await file.text()
      console.log("📄 File content length:", text.length)
      console.log("📄 File content preview:", text.substring(0, 200))

      if (!text || text.trim().length === 0) {
        throw new Error("File is empty or could not be read")
      }

      setUploadProgress(25)
      toast.info("Parsing JSON data...")

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
          created_at: conversation.create_time
            ? new Date(conversation.create_time * 1000).toISOString()
            : new Date().toISOString(),
          last_message_at: conversation.update_time
            ? new Date(conversation.update_time * 1000).toISOString()
            : new Date().toISOString(),
          messages: conversation.mapping
            ? Object.values(conversation.mapping)
                .filter((node: any) => node.message && node.message.content && node.message.content.parts)
                .map((node: any) => ({
                  id: node.id || uuidv4(),
                  content: Array.isArray(node.message.content.parts) ? node.message.content.parts.join("\n") : "",
                  role: node.message.author?.role || "user",
                  created_at: node.message.create_time
                    ? new Date(node.message.create_time * 1000).toISOString()
                    : new Date().toISOString(),
                  user_id: "imported",
                }))
            : [],
        }))
        console.log("📥 Detected ChatGPT export format")
      } else if (importData.conversations && Array.isArray(importData.conversations)) {
        // Another common format
        threads = importData.conversations.map((conversation: any) => ({
          id: conversation.id || uuidv4(),
          title: conversation.title || conversation.name || "Imported Chat",
          created_at: conversation.created_at || conversation.createdAt || new Date().toISOString(),
          last_message_at: conversation.updated_at || conversation.updatedAt || new Date().toISOString(),
          messages: conversation.messages || [],
        }))
        console.log("📥 Detected generic conversation format")
      } else {
        throw new Error(
          "Unsupported file format. Please ensure your JSON file contains conversations in a supported format.",
        )
      }

      if (threads.length === 0) {
        throw new Error("No conversations found in the JSON file")
      }

      setUploadProgress(40)
      toast.info(`Found ${threads.length} conversations to import. Starting import...`)

      let importedThreads = 0
      let importedMessages = 0
      let importedArtifacts = 0
      let skippedThreads = 0
      let skippedArtifacts = 0

      // Keep track of old thread ID to new thread ID mapping
      const threadIdMapping: Record<string, string> = {}

      // Import each thread
      for (let i = 0; i < threads.length; i++) {
        const threadData = threads[i]
        try {
          const progress = 40 + (i / threads.length) * 40
          setUploadProgress(progress)
          toast.info(`Importing conversation ${i + 1} of ${threads.length}: ${threadData.title}`)

          // Generate new IDs to avoid conflicts
          const newThreadId = uuidv4()

          // Store the mapping from old thread ID to new thread ID
          threadIdMapping[threadData.id] = newThreadId

          console.log(`📥 Importing thread: ${threadData.title} (${threadData.messages?.length || 0} messages)`)
          console.log(`🔄 Thread ID mapping: ${threadData.id} -> ${newThreadId}`)

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
                  createdAt: messageData.created_at ? new Date(messageData.created_at) : new Date(),
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

      // Import artifacts if they exist
      if (importData.artifacts && Array.isArray(importData.artifacts)) {
        toast.info(`Importing ${importData.artifacts.length} artifacts...`)

        for (let i = 0; i < importData.artifacts.length; i++) {
          const artifactData = importData.artifacts[i]
          try {
            const progress = 80 + (i / importData.artifacts.length) * 15
            setUploadProgress(progress)
            toast.info(`Importing artifact ${i + 1} of ${importData.artifacts.length}: ${artifactData.title}`)

            const { data: session } = await supabase.auth.getSession()
            if (!session.session?.access_token) {
              throw new Error("No access token for artifact import")
            }

            // Map old thread ID to new thread ID if it exists
            const mappedThreadId = artifactData.thread_id ? threadIdMapping[artifactData.thread_id] : null

            // Prepare artifact data for API
            const artifactPayload = {
              title: artifactData.title,
              description: artifactData.description,
              content: artifactData.content,
              content_type: artifactData.content_type,
              language: artifactData.language,
              file_extension: artifactData.file_extension,
              tags: artifactData.tags || [],
              metadata: artifactData.metadata || {},
              thread_id: mappedThreadId, // Use mapped thread ID or null
              message_id: null, // Set to null since message IDs are also regenerated
            }

            console.log(`📤 Sending artifact data:`, {
              title: artifactPayload.title,
              content_type: artifactPayload.content_type,
              contentLength: artifactPayload.content?.length,
              hasDescription: !!artifactPayload.description,
              tagsCount: artifactPayload.tags?.length,
              originalThreadId: artifactData.thread_id,
              mappedThreadId: mappedThreadId,
              thread_id: artifactPayload.thread_id,
              message_id: artifactPayload.message_id,
            })

            // Create artifact via API
            const response = await fetch("/api/artifacts", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(artifactPayload),
            })

            if (response.ok) {
              importedArtifacts++
              console.log(`✅ Successfully imported artifact: ${artifactData.title}`)
            } else {
              const errorText = await response.text()
              console.error(`❌ API Error Response:`, {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
              })
              throw new Error(`Failed to create artifact: ${response.statusText} - ${errorText}`)
            }
          } catch (error) {
            console.error(`❌ Failed to import artifact ${artifactData.title}:`, error)
            skippedArtifacts++
            // Continue with other artifacts
          }
        }
      }

      setUploadProgress(100)
      setImportStats({
        threadsCount: importedThreads,
        messagesCount: importedMessages,
      })

      let successMessage = `Successfully imported ${importedThreads} conversations with ${importedMessages} messages`
      if (importedArtifacts > 0) {
        successMessage += ` and ${importedArtifacts} artifacts`
      }

      let warningMessage = ""
      if (skippedThreads > 0 || skippedArtifacts > 0) {
        const warnings = []
        if (skippedThreads > 0) warnings.push(`${skippedThreads} threads`)
        if (skippedArtifacts > 0) warnings.push(`${skippedArtifacts} artifacts`)
        warningMessage = ` (${warnings.join(" and ")} were skipped due to errors)`
      }

      toast.success(successMessage + warningMessage)

      if (skippedThreads > 0 || skippedArtifacts > 0) {
        const warnings = []
        if (skippedThreads > 0) warnings.push(`${skippedThreads} threads`)
        if (skippedArtifacts > 0) warnings.push(`${skippedArtifacts} artifacts`)
        toast.warning(`${warnings.join(" and ")} were skipped due to import errors. Check the console for details.`)
      }
    } catch (error) {
      console.error("Import failed:", error)
      console.error("Full error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? error.cause : undefined,
      })

      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON file format. Please check that your file is valid JSON.")
      } else if (error instanceof Error && error.message.includes("not authenticated")) {
        toast.error("Authentication required. Please sign in and try again.")
      } else if (error instanceof Error && error.message.includes("permission")) {
        toast.error("Permission denied. Please check your account permissions.")
      } else {
        toast.error(`Failed to import chat history: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    } finally {
      setIsImporting(false)
      setUploadProgress(0)
    }
  }

  const handleImportHistory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔍 handleImportHistory triggered from:", event.type || "unknown event")
    console.log("📋 Event:", event)
    console.log("📋 Event target:", event.target)
    console.log("📋 Event target value:", event.target.value)
    console.log("📁 Files:", event.target.files)
    console.log("📁 Files length:", event.target.files?.length)
    console.log("📁 Files array:", Array.from(event.target.files || []))

    // Add stack trace to see where this is called from
    console.log("📍 Call stack:", new Error().stack)

    // Show immediate feedback that file selection was detected
    toast.info("File selected, processing...")

    const file = event.target.files?.[0]
    if (!file) {
      console.log("❌ No file selected")
      toast.error("No file selected")
      return
    }

    console.log("📁 File selected:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    })

    // Show file details in UI
    toast.info(`Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    // Validate file type
    if (!file.type.includes("json") && !file.name.endsWith(".json")) {
      console.log("❌ Invalid file type:", file.type)
      toast.error(`Invalid file type: ${file.type}. Please select a valid JSON file`)
      return
    }

    console.log("✅ File validation passed, starting import process...")

    try {
      await processImportFile(file)
      console.log("✅ Import process completed successfully")
    } catch (error) {
      console.error("❌ Import process failed:", error)
      toast.error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      // Reset the file input
      event.target.value = ""
      console.log("🔄 File input reset")
    }
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
    console.log(
      "📁 Dropped files:",
      files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    )
    const jsonFile = files.find((file) => file.type === "application/json" || file.name.endsWith(".json"))

    if (jsonFile) {
      console.log("✅ Valid JSON file found:", jsonFile.name)
      processImportFile(jsonFile)
    } else {
      console.log("❌ No valid JSON file found")
      toast.error("Please drop a valid JSON file")
    }
  }, [])

  const handleFileButtonClick = (e: React.MouseEvent) => {
    // Prevent event propagation to avoid conflicts with drag/drop handlers
    e.preventDefault()
    e.stopPropagation()

    console.log("🖱️ Browse Files button clicked")
    console.log("📋 File input ref:", fileInputRef.current)
    console.log("📋 File input ref exists:", !!fileInputRef.current)

    if (fileInputRef.current) {
      console.log("✅ File input exists, triggering click")

      // Add event listener to catch the change event before clicking
      const handleFileChange = (event: Event) => {
        console.log("🎯 Direct file change event caught!")
        const target = event.target as HTMLInputElement
        console.log("📁 Files from direct event:", target.files)

        if (target.files && target.files.length > 0) {
          console.log("📁 File selected via direct event, processing...")
          const syntheticEvent = {
            target: target,
            currentTarget: target,
          } as React.ChangeEvent<HTMLInputElement>

          handleImportHistory(syntheticEvent)
        }

        // Remove the listener after handling
        fileInputRef.current?.removeEventListener("change", handleFileChange)
      }

      // Add temporary event listener
      fileInputRef.current.addEventListener("change", handleFileChange)

      try {
        fileInputRef.current.click()
        console.log("✅ File input click triggered successfully")
      } catch (error) {
        console.error("❌ Error triggering file input click:", error)
        toast.error("Failed to open file dialog")
        // Clean up the event listener if click failed
        fileInputRef.current?.removeEventListener("change", handleFileChange)
      }
    } else {
      console.error("❌ File input ref is null")
      toast.error("File input not available")
    }
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-2 pb-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <History className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Chat History Management</h2>
        <p className="text-muted-foreground">Export, import, and manage your conversation data</p>
      </div>

      <Separator className="my-8" />

      {/* Export Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Archive className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Export Chat History</h3>
            <p className="text-sm text-muted-foreground">Create a backup of all your conversations</p>
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Export Info Card */}
              <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-4">
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary">
                    <FileText className="h-3 w-3 mr-1" />
                    Portable
                  </Badge>
                </div>
                <div className="flex items-start gap-4 pr-20">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">JSON Format</h4>
                    <p className="text-sm text-muted-foreground">
                      Includes all conversations, messages, artifacts, and metadata in a structured format that can be
                      imported into any LoveChat instance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExportHistory}
                disabled={isExporting}
                className="w-full gap-3 h-12 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span>Export Chat History</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Import Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-secondary/50 border border-secondary">
            <Upload className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Import Chat History</h3>
            <p className="text-sm text-muted-foreground">Restore conversations from a backup file</p>
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Information Panels */}
              <div className="grid gap-4">
                {/* Important Note */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      Safe Import Process
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Your existing conversations will be preserved. New conversations will be added alongside your
                      current ones.
                    </p>
                  </div>
                </div>

                {/* Supported Formats */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="p-1.5 rounded-lg bg-secondary/50 border border-secondary">
                    <FileText className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Supported Formats</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      These formats can be imported into LoveChat:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary"></div>
                        LoveChat exports (.json)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary"></div>
                        ChatGPT conversation exports
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary"></div>
                        Generic conversation JSON files
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div className="space-y-4">
                <Label htmlFor="import-file" className="text-sm font-medium">
                  Import JSON File
                </Label>

                {/* Hidden file input */}
                <input
                  id="import-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportHistory}
                  disabled={isImporting}
                  className="hidden"
                />

                {/* Enhanced Drag and Drop Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                    isDragOver
                      ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
                  } ${isImporting ? "opacity-50 pointer-events-none" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-4">
                    <CloudUpload
                      className={`mx-auto h-12 w-12 transition-all duration-300 ${
                        isDragOver ? "text-primary scale-110" : "text-muted-foreground"
                      }`}
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {isDragOver ? "Drop your JSON file here" : "Drag and drop your JSON file here"}
                      </p>
                      <p className="text-xs text-muted-foreground">or</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFileButtonClick}
                        disabled={isImporting}
                        className="mt-2 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>

                    {/* Upload Progress */}
                    {isImporting && uploadProgress > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Import Success Status */}
              {importStats && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground mb-1">Import Successful</h4>
                    <p className="text-xs text-muted-foreground">
                      Imported {importStats.threadsCount} conversations with {importStats.messagesCount} messages
                    </p>
                  </div>
                </div>
              )}

              {/* Import Loading State */}
              {isImporting && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Processing import file...</p>
                    <p className="text-xs text-muted-foreground">
                      This may take a few moments for large files
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Danger Zone */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Manage Chat History</h3>
            <p className="text-sm text-muted-foreground">Permanently delete all your conversations</p>
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Danger Zone Warning */}
              <div className="relative overflow-hidden rounded-xl border bg-destructive/5 border-destructive/20">
                <div className="absolute top-3 right-3">
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Danger Zone
                  </Badge>
                </div>
                <div className="flex items-start gap-4 p-4 pr-24">
                  <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <Lock className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Permanent Deletion</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      This action cannot be undone. All your conversations, messages, and associated data will be
                      permanently deleted.
                    </p>
                    <p className="text-xs text-destructive font-medium">
                      💡 Consider exporting your data first if you want to keep a backup.
                    </p>
                  </div>
                </div>
              </div>

              {/* Delete Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full gap-3 h-12 shadow-lg hover:shadow-xl transition-all duration-300 group"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span>Delete All Chat History</span>
                        <Lock className="h-4 w-4 opacity-70" />
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <span>Delete All Chat History?</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 pt-2">
                      <p>
                        This will permanently delete all your conversations, messages, and associated data. This action
                        cannot be undone.
                      </p>
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          💡 Recommendation: Export your data first if you want to keep a backup.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllHistory}
                      className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
