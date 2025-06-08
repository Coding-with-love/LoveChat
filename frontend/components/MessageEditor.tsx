"use client"

import { createMessage, deleteTrailingMessages } from "@/lib/supabase/queries"
import type { UseChatHelpers } from "@ai-sdk/react"
import { useCompletion } from "@ai-sdk/react"
import { useState } from "react"
import type { UIMessage } from "ai"
import type { Dispatch, SetStateAction } from "react"
import { v4 as uuidv4 } from "uuid"
import { Textarea } from "./ui/textarea"
import { Button } from "./ui/button"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { getAuthHeaders } from "@/lib/auth-headers"
import { toast } from "sonner"

export default function MessageEditor({
  threadId,
  message,
  content,
  setMessages,
  reload,
  setMode,
  stop,
}: {
  threadId: string
  message: UIMessage
  content: string
  setMessages: UseChatHelpers["setMessages"]
  setMode: Dispatch<SetStateAction<"view" | "edit">>
  reload: UseChatHelpers["reload"]
  stop: UseChatHelpers["stop"]
}) {
  const [draftContent, setDraftContent] = useState(content)
  const [isLoading, setIsLoading] = useState(false)
  const getKey = useAPIKeyStore((state) => state.getKey)

  const { complete } = useCompletion({
    api: "/api/completion",
    headers: async () => {
      try {
        const authHeaders = await getAuthHeaders()
        const googleKey = getKey("google")
        if (googleKey) {
          authHeaders["X-Google-API-Key"] = googleKey
        }
        return authHeaders
      } catch (error) {
        console.error("Failed to get headers:", error)
        toast.error("Authentication failed")
        throw error
      }
    },
    onResponse: async (response) => {
      try {
        if (!response.ok) {
          const errorData = await response.json()
          toast.error(errorData.error || "Failed to generate a summary for the message")
          return
        }

        const payload = await response.json()
        const { title, messageId, threadId } = payload
        // The API already handles database updates
        toast.success("Message summary created")
      } catch (error) {
        console.error("Failed to process completion response:", error)
        toast.error("Failed to process response")
      }
    },
    onError: (error) => {
      console.error("Completion error:", error)
      toast.error("Failed to generate summary")
    },
  })

  const handleSave = async () => {
    if (isLoading) return

    try {
      setIsLoading(true)
      await deleteTrailingMessages(threadId, message.createdAt as Date)

      const updatedMessage = {
        ...message,
        id: uuidv4(),
        content: draftContent,
        parts: [
          {
            type: "text" as const,
            text: draftContent,
          },
        ],
        createdAt: new Date(),
      }

      await createMessage(threadId, updatedMessage)

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id)

        if (index !== -1) {
          return [...messages.slice(0, index), updatedMessage]
        }

        return messages
      })

      complete(draftContent, {
        body: {
          messageId: updatedMessage.id,
          threadId,
        },
      })
      setMode("view")

      // stop the current stream if any
      stop()

      setTimeout(() => {
        reload()
      }, 0)
    } catch (error) {
      console.error("Failed to save message:", error)
      toast.error("Failed to save message")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Textarea
        value={draftContent}
        onChange={(e) => setDraftContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSave()
          }
        }}
        disabled={isLoading}
      />
      <div className="flex gap-2 mt-2">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
        <Button onClick={() => setMode("view")} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
