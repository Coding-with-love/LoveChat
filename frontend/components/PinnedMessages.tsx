"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Star, X, Edit3, MessageSquare, Clock, User } from 'lucide-react'
import { formatDistanceToNow } from "date-fns"
import { usePinnedMessages } from "../hooks/usePinnedMessages"
import MemoizedMarkdown from "./MemoizedMarkdown"

interface PinnedMessagesProps {
  threadId: string
  onClose: () => void
  onMessageClick?: (messageId: string) => void
}

export function PinnedMessages({ threadId, onClose, onMessageClick }: PinnedMessagesProps) {
  const { pinnedMessages, loading, unpinMessage, updatePinnedMessageNote } = usePinnedMessages(threadId)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")

  const handleEditNote = (pinnedMessageId: string, currentNote: string) => {
    setEditingNote(pinnedMessageId)
    setNoteText(currentNote || "")
  }

  const handleSaveNote = async (pinnedMessageId: string) => {
    await updatePinnedMessageNote(pinnedMessageId, noteText)
    setEditingNote(null)
    setNoteText("")
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setNoteText("")
  }

  const handleUnpin = async (pinnedMessageId: string) => {
    await unpinMessage(pinnedMessageId)
  }

  const handleMessageClick = (messageId: string) => {
    if (onMessageClick) {
      onMessageClick(messageId)
      onClose()
    }
  }

  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-current" />
            Pinned Messages
            {pinnedMessages.length > 0 && <Badge variant="secondary">{pinnedMessages.length}</Badge>}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No pinned messages yet</p>
              <p className="text-sm">Pin important messages by clicking the star icon</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pinnedMessages.map((pinnedMessage) => (
                <Card key={pinnedMessage.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Message Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={pinnedMessage.messages?.role === "user" ? "default" : "secondary"}>
                            {pinnedMessage.messages?.role === "user" ? (
                              <User className="h-3 w-3 mr-1" />
                            ) : (
                              <MessageSquare className="h-3 w-3 mr-1" />
                            )}
                            {pinnedMessage.messages?.role === "user" ? "You" : "Assistant"}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {pinnedMessage.messages?.created_at &&
                              formatDistanceToNow(new Date(pinnedMessage.messages.created_at), { addSuffix: true })}
                          </div>
                        </div>

                        {/* Message Content */}
                        <div
                          className="prose prose-sm max-w-none mb-3 cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors"
                          onClick={() => handleMessageClick(pinnedMessage.message_id)}
                        >
                          <MemoizedMarkdown content={truncateContent(pinnedMessage.messages?.content || "")} />
                        </div>

                        {/* Note Section */}
                        {editingNote === pinnedMessage.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Add a note about why this message is important..."
                              className="min-h-[60px]"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveNote(pinnedMessage.id)}>
                                Save Note
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : pinnedMessage.note ? (
                          <div className="bg-muted/50 rounded p-3 mt-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Your note:</p>
                                <p className="text-sm">{pinnedMessage.note}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditNote(pinnedMessage.id, pinnedMessage.note || "")}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-muted-foreground"
                            onClick={() => handleEditNote(pinnedMessage.id, "")}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Add note
                          </Button>
                        )}

                        {/* Pinned Date */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Star className="h-3 w-3 fill-current text-yellow-500" />
                          Pinned {formatDistanceToNow(new Date(pinnedMessage.created_at), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Full Message</DialogTitle>
                            </DialogHeader>
                            <div className="prose prose-sm max-w-none">
                              <MemoizedMarkdown content={pinnedMessage.messages?.content || ""} />
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnpin(pinnedMessage.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PinnedMessages
