"use client"

import { type Dispatch, type SetStateAction, useState, useCallback, useEffect } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Textarea } from "./ui/textarea"
import { cn } from "@/lib/utils"
import { Check, Copy, RefreshCcw, SquarePen, Star, Archive } from "lucide-react"
import type { UIMessage } from "ai"
import type { UseChatHelpers } from "@ai-sdk/react"

// Extend UIMessage to include attempts
interface ExtendedUIMessage extends UIMessage {
  attempts?: ExtendedUIMessage[]
}
import { deleteTrailingMessages, getFileAttachmentsByMessageId } from "@/lib/supabase/queries"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRegeneration } from "@/frontend/contexts/RegenerationContext"
import { useRegenerationTracker } from "@/frontend/hooks/useRegenerationTracker"

interface MessageControlsProps {
  threadId: string
  message: ExtendedUIMessage
  setMessages: UseChatHelpers["setMessages"]
  content: string
  setMode?: Dispatch<SetStateAction<"view" | "edit">>
  reload: UseChatHelpers["reload"]
  stop: UseChatHelpers["stop"]
  onCopy?: () => void
  onEdit?: () => void
  onPin?: () => void
}

export default function MessageControls({
  threadId,
  message,
  setMessages,
  content,
  setMode,
  reload,
  stop,
  onCopy,
  onEdit,
  onPin,
}: MessageControlsProps) {
  const [copied, setCopied] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [pinNote, setPinNote] = useState("")
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

  // API keys are now optional with server fallbacks - always allow regeneration/editing
  const hasRequiredKeys = true
  
  // Debug logging
  console.log("🔑 Default keys available - always allowing regeneration/editing for message:", message.id, "role:", message.role)
  const { createArtifact } = useArtifactStore()
  
  // Try to get regeneration context, with fallback if not available
  let startRegeneration
  try {
    const regenerationContext = useRegeneration()
    startRegeneration = regenerationContext.startRegeneration
  } catch (error) {
    console.warn("⚠️ Regeneration context not available, using fallback")
    startRegeneration = (messageId: string, message: any) => {
      console.log("📝 Fallback regeneration tracking for:", messageId)
    }
  }

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
    onCopy?.()
  }, [content, onCopy])

  const handleEdit = useCallback(() => {
    setMode?.("edit")
    onEdit?.()
  }, [setMode, onEdit])

  const handleSaveAsArtifact = useCallback(async () => {
    try {
      // Extract code blocks from content
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
      const matches = [...content.matchAll(codeBlockRegex)]

      if (matches.length > 0) {
        // If there are code blocks, save the first one as an artifact
        const [, language, code] = matches[0]
        await createArtifact({
          title: `Code from ${new Date().toLocaleDateString()}`,
          content: code.trim(),
          content_type: "code",
          language: language || "text",
          thread_id: threadId,
          message_id: message.id,
          tags: ["code", "chat-generated"],
        })
      } else {
        // Save the entire message content as an artifact
        await createArtifact({
          title: `Message from ${new Date().toLocaleDateString()}`,
          content: content,
          content_type: "text",
          thread_id: threadId,
          message_id: message.id,
          tags: ["message", "chat-generated"],
        })
      }

      toast.success("Saved as artifact!")
    } catch (error) {
      console.error("Failed to save artifact:", error)
      toast.error("Failed to save artifact")
    }
  }, [content, threadId, message.id, createArtifact])

  const handleRegenerate = useCallback(async () => {
    console.log("🔄 Regenerate button clicked for message:", message.id, "Role:", message.role)
    
    try {
      // stop the current request
      stop()
      
      // Start tracking regeneration for attempts
      if (message.role === "assistant") {
        console.log("🎯 Processing assistant message regeneration")
        
        try {
          startRegeneration(message.id, message)
          console.log("✅ Started regeneration tracking successfully")
        } catch (error) {
          console.error("❌ Error starting regeneration tracking:", error)
        }
        
        // For demo: immediately create an attempt to test the UI
        const newAttempt = {
          ...message,
          id: message.id + "-regenerated-" + Date.now(),
          content: "This is a regenerated version: " + message.content.substring(0, 100) + "... [REGENERATED]",
          createdAt: new Date()
        }
        
        console.log("📝 Created new attempt:", newAttempt.id)
        
        // Update the message to have attempts
        const updatedMessage = {
          ...message,
          attempts: message.attempts ? [...message.attempts, newAttempt] : [message, newAttempt]
        }
        
        console.log("🔄 Updating messages with attempts. Total attempts:", updatedMessage.attempts?.length)
        
        try {
          setMessages((messages) => {
            console.log("📝 SetMessages called, current messages count:", messages.length)
            const updated = messages.map(m => m.id === message.id ? updatedMessage : m)
            console.log("📝 Returning updated messages, count:", updated.length)
            return updated
          })
          console.log("✅ SetMessages completed successfully")
        } catch (error) {
          console.error("❌ Error calling setMessages:", error)
        }
        
        console.log("✅ Added regenerated attempt. Total attempts:", updatedMessage.attempts?.length)
        
        // Continue with actual regeneration API call after creating the attempt
        console.log("🚀 Proceeding with actual API regeneration...")
        // Don't return here - let it continue to the actual regeneration logic below
      }

      // Extract file attachments from message parts
      let fileAttachments = (message.parts as any)?.find((part: any) => part.type === "file_attachments")?.attachments || []
      console.log("🔍 Found file attachments for regeneration:", fileAttachments)

      // If we have file attachments, try to fetch their content
      if (fileAttachments.length > 0) {
        console.log("📁 Fetching file content for regeneration...")

        // Fetch file attachments with content from the database
        try {
          const dbAttachments = await getFileAttachmentsByMessageId(message.id)
          console.log("📄 Database attachments:", dbAttachments)

          // Merge the file content from database with existing attachments
          fileAttachments = await Promise.all(
            fileAttachments.map(async (attachment: any) => {
              const dbAttachment = dbAttachments.find((db) => db.file_name === attachment.fileName)

              if (dbAttachment?.file_url) {
                try {
                  // Fetch the actual file content from storage
                  const response = await fetch(dbAttachment.file_url)
                  if (response.ok) {
                    const content = await response.text()
                    console.log(`✅ Fetched content for ${attachment.fileName}:`, content.substring(0, 100) + "...")

                    return {
                      ...attachment,
                      content: content,
                      extractedText: content,
                      fileUrl: dbAttachment.file_url,
                    }
                  }
                } catch (error) {
                  console.error(`❌ Error fetching content for ${attachment.fileName}:`, error)
                }
              }

              return attachment
            }),
          )
        } catch (error) {
          console.error("❌ Error fetching file attachments from database:", error)
        }
      }

      if (message.role === "user") {
        await deleteTrailingMessages(threadId, message.createdAt as Date, false)

        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === message.id)

          if (index !== -1) {
            // Make sure to preserve the file attachments in the user message with content
            const updatedMessage = {
              ...messages[index],
              parts: messages[index].parts || [],
            }

            // Update file attachments with content
            if (fileAttachments.length > 0) {
              const attachmentPartIndex = (updatedMessage.parts as any).findIndex((p: any) => p.type === "file_attachments")
              if (attachmentPartIndex >= 0) {
                (updatedMessage.parts as any)[attachmentPartIndex] = {
                  type: "file_attachments",
                  attachments: fileAttachments,
                }
              } else {
                (updatedMessage.parts as any).push({
                  type: "file_attachments",
                  attachments: fileAttachments,
                })
              }
            }

            return [...messages.slice(0, index), updatedMessage]
          }

          return messages
        })
      } else {
        await deleteTrailingMessages(threadId, message.createdAt as Date)

        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === message.id)

          if (index !== -1) {
            // Instead of removing the message, prepare it for storing multiple attempts
            const currentMessage = messages[index] as ExtendedUIMessage
            const updatedMessage: ExtendedUIMessage = {
              ...currentMessage,
              attempts: currentMessage.attempts || [currentMessage],
            }
            
            return [...messages.slice(0, index), updatedMessage]
          }

          return messages
        })
      }

      setTimeout(() => {
        // Convert image files to experimental_attachments for vision models
        const experimentalAttachments = fileAttachments
          .filter((file: any) => file.fileType && file.fileType.startsWith("image/") && file.fileUrl)
          .map((file: any) => ({
            name: file.fileName,
            contentType: file.fileType,
            url: file.fileUrl,
          }))

        console.log("🖼️ Regenerating with image attachments:", {
          imageCount: experimentalAttachments.length,
          images: experimentalAttachments.map((img: any) => ({
            name: img.name,
            contentType: img.contentType,
            hasUrl: !!img.url
          }))
        })

        // Pass file attachments with content to the reload function
        reload({
          experimental_attachments: experimentalAttachments.length > 0 ? experimentalAttachments : undefined,
          data: {
            fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
          },
        })
      }, 0)
    } catch (error) {
      console.error("Failed to regenerate message:", error)
      toast.error("Failed to regenerate message")
    }
  }, [message, reload, setMessages, stop, threadId])

  const handlePinClick = useCallback(() => {
    if (isPinned) {
      handleUnpin()
    } else {
      setShowPinDialog(true)
      onPin?.()
    }
  }, [isPinned, onPin])

  const handlePin = useCallback(async () => {
    try {
      setPinLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("You must be logged in to pin messages")
        return
      }

      const { error } = await supabase.from("pinned_messages").insert({
        thread_id: threadId,
        message_id: message.id,
        user_id: user.id,
        note: pinNote || null,
      })

      if (error) {
        console.error("Error pinning message:", error)
        toast.error("Failed to pin message")
        return
      }

      setIsPinned(true)
      setShowPinDialog(false)
      setPinNote("")
      toast.success("Message pinned!")
    } catch (error) {
      console.error("Error pinning message:", error)
      toast.error("Failed to pin message")
    } finally {
      setPinLoading(false)
    }
  }, [threadId, message.id, pinNote])

  const handleUnpin = useCallback(async () => {
    try {
      setPinLoading(true)
      const { error } = await supabase
        .from("pinned_messages")
        .delete()
        .eq("thread_id", threadId)
        .eq("message_id", message.id)

      if (error) {
        console.error("Error unpinning message:", error)
        toast.error("Failed to unpin message")
        return
      }

      setIsPinned(false)
      toast.success("Message unpinned!")
    } catch (error) {
      console.error("Error unpinning message:", error)
      toast.error("Failed to unpin message")
    } finally {
      setPinLoading(false)
    }
  }, [threadId, message.id])

  // Check if message is pinned on mount
  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        const { data } = await supabase
          .from("pinned_messages")
          .select("id")
          .eq("thread_id", threadId)
          .eq("message_id", message.id)
          .single()

        setIsPinned(!!data)
      } catch (error) {
        // Message is not pinned, which is fine
        setIsPinned(false)
      }
    }

    checkPinStatus()
  }, [threadId, message.id])

  return (
    <div
      className="opacity-60 group-hover:opacity-100 transition-opacity duration-100 flex gap-1"
    >
      <Button variant="ghost" size="icon" onClick={handleCopy}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>

      {/* Archive Button */}
      <Button variant="ghost" size="icon" onClick={handleSaveAsArtifact} title="Save as Artifact">
        <Archive className="w-4 h-4" />
      </Button>

      {/* Pin Button */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePinClick}
            disabled={pinLoading}
            className={cn("transition-colors", isPinned && "text-yellow-500 hover:text-yellow-600")}
          >
            <Star className={cn("w-4 h-4", isPinned && "fill-current")} />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pin Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="pin-note" className="text-sm font-medium">
                Add a note (optional)
              </label>
              <Textarea
                id="pin-note"
                placeholder="Why is this message important?"
                value={pinNote}
                onChange={(e) => setPinNote(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPinDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePin} disabled={pinLoading}>
                {pinLoading ? "Pinning..." : "Pin Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {setMode && hasRequiredKeys && (
        <Button variant="ghost" size="icon" onClick={handleEdit}>
          <SquarePen className="w-4 h-4" />
        </Button>
      )}
      {hasRequiredKeys && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            console.log("🖱️ Regenerate button clicked!")
            handleRegenerate()
          }}
        >
          <RefreshCcw className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
