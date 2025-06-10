"use client"

import { useState, useCallback, memo } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Textarea } from "./ui/textarea"
import { Star } from 'lucide-react'
import { usePinnedMessages } from "../hooks/usePinnedMessages"

interface PinButtonProps {
  messageId: string
  threadId: string
  size?: "sm" | "default"
  variant?: "ghost" | "outline" | "default"
}

function PinButtonComponent({ messageId, threadId, size = "sm", variant = "ghost" }: PinButtonProps) {
  const { pinMessage, unpinMessage, isMessagePinned, getPinnedMessageData } = usePinnedMessages(threadId)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const isPinned = isMessagePinned(messageId)
  const pinnedData = getPinnedMessageData(messageId)

  const handlePin = useCallback(async () => {
    if (isPinned) {
      // Unpin the message
      if (pinnedData) {
        setIsLoading(true)
        await unpinMessage(pinnedData.id)
        setIsLoading(false)
      }
    } else {
      // Open dialog to add note (optional)
      setIsDialogOpen(true)
    }
  }, [isPinned, pinnedData, unpinMessage])

  const handlePinWithNote = useCallback(async () => {
    setIsLoading(true)
    await pinMessage(messageId, note)
    setNote("")
    setIsDialogOpen(false)
    setIsLoading(false)
  }, [pinMessage, messageId, note])

  const handlePinWithoutNote = useCallback(async () => {
    setIsLoading(true)
    await pinMessage(messageId)
    setIsDialogOpen(false)
    setIsLoading(false)
  }, [pinMessage, messageId])

  const handleDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setNote("")
    }
    setIsDialogOpen(open)
  }, [])

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={handlePin}
        disabled={isLoading}
        className={isPinned ? "text-yellow-500" : ""}
        title={isPinned ? "Unpin message" : "Pin message"}
      >
        <Star className={`h-4 w-4 ${isPinned ? "fill-current" : ""}`} />
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pin Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add an optional note to explain why this message is important:
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Important code solution, Key instruction, Reference for later..."
              className="min-h-[80px]"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handlePinWithoutNote} disabled={isLoading}>
                Pin without note
              </Button>
              <Button onClick={handlePinWithNote} disabled={isLoading}>
                Pin with note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const PinButton = memo(PinButtonComponent)
