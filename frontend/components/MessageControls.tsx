"use client"

import { type Dispatch, type SetStateAction, useState } from "react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { Check, Copy, RefreshCcw, SquarePen } from 'lucide-react'
import type { UIMessage } from "ai"
import type { UseChatHelpers } from "@ai-sdk/react"
import { deleteTrailingMessages, getFileAttachmentsByMessageId } from "@/lib/supabase/queries"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { toast } from "sonner"

interface MessageControlsProps {
  threadId: string
  message: UIMessage
  setMessages: UseChatHelpers["setMessages"]
  content: string
  setMode?: Dispatch<SetStateAction<"view" | "edit">>
  reload: UseChatHelpers["reload"]
  stop: UseChatHelpers["stop"]
}

export default function MessageControls({
  threadId,
  message,
  setMessages,
  content,
  setMode,
  reload,
  stop,
}: MessageControlsProps) {
  const [copied, setCopied] = useState(false)
  const hasRequiredKeys = useAPIKeyStore((state) => state.hasRequiredKeys())

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  const handleRegenerate = async () => {
    try {
      // stop the current request
      stop()

      // Extract file attachments from message parts
      let fileAttachments = message.parts?.find((part) => part.type === "file_attachments")?.attachments || []
      console.log("🔍 Found file attachments for regeneration:", fileAttachments)

      // If we have file attachments, try to fetch their content
      if (fileAttachments.length > 0) {
        console.log("📁 Fetching file content for regeneration...")
        
        // Fetch file attachments with content from the database
        try {
          const dbAttachments = await getFileAttachmentsByMessageId(message.id)
          console.log("📄 Database attachments:", dbAttachments)

          // Merge the file content from database with existing attachments
          fileAttachments = await Promise.all(fileAttachments.map(async (attachment) => {
            const dbAttachment = dbAttachments.find(db => db.file_name === attachment.fileName)
            
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
          }))
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
              const attachmentPartIndex = updatedMessage.parts.findIndex(p => p.type === "file_attachments")
              if (attachmentPartIndex >= 0) {
                updatedMessage.parts[attachmentPartIndex] = {
                  type: "file_attachments",
                  attachments: fileAttachments,
                }
              } else {
                updatedMessage.parts.push({
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
            return [...messages.slice(0, index)]
          }

          return messages
        })
      }

      setTimeout(() => {
        // Pass file attachments with content to the reload function
        reload({
          options: {
            data: {
              fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
            }
          }
        })
      }, 0)
    } catch (error) {
      console.error("Failed to regenerate message:", error)
      toast.error("Failed to regenerate message")
    }
  }

  return (
    <div
      className={cn("opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex gap-1", {
        "absolute mt-5 right-2": message.role === "user",
      })}
    >
      <Button variant="ghost" size="icon" onClick={handleCopy}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
      {setMode && hasRequiredKeys && (
        <Button variant="ghost" size="icon" onClick={() => setMode("edit")}>
          <SquarePen className="w-4 h-4" />
        </Button>
      )}
      {hasRequiredKeys && (
        <Button variant="ghost" size="icon" onClick={handleRegenerate}>
          <RefreshCcw className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
