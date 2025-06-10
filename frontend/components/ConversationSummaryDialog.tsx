"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { ScrollArea } from "./ui/scroll-area"
import { FileText, Loader2, CheckSquare, Lightbulb, Hash, RefreshCw, Tag } from "lucide-react"
import { useConversationSummary } from "@/frontend/hooks/useConversationSummary"

interface ConversationSummaryDialogProps {
  threadId: string
  trigger?: React.ReactNode
}

export function ConversationSummaryDialog({ threadId, trigger }: ConversationSummaryDialogProps) {
  const [open, setOpen] = useState(false)
  const { summary, isLoading, error, generateSummary, clearSummary, loadExistingSummary, setCurrentThreadId } =
    useConversationSummary()

  const handleSummarize = async () => {
    try {
      await generateSummary(threadId)
    } catch (err) {
      console.error("Failed to generate summary:", err)
    }
  }

  const handleRegenerate = async () => {
    try {
      await generateSummary(threadId, true) // forceRegenerate = true
    } catch (err) {
      console.error("Failed to regenerate summary:", err)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      // Load existing summary when dialog opens
      setCurrentThreadId(threadId)
    } else {
      // Clear summary when dialog closes
      setTimeout(() => {
        clearSummary()
        setCurrentThreadId(null)
      }, 300)
    }
  }

  // Load existing summary when threadId changes and dialog is open
  useEffect(() => {
    if (open && threadId) {
      setCurrentThreadId(threadId)
    }
  }, [open, threadId, setCurrentThreadId])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Summarize
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Conversation Summary
          </DialogTitle>
          <DialogDescription>
            AI-generated summary of this conversation with key points and action items.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!summary && !isLoading && !error && (
            <div className="flex items-center justify-center h-full px-6">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Generate a summary of this conversation to extract key points and action items.
                </p>
                <Button onClick={handleSummarize} disabled={isLoading}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Summary
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center h-full px-6">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  {summary ? "Regenerating summary..." : "Analyzing conversation..."}
                </p>
                <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full px-6">
              <div className="text-center">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
                <Button onClick={handleSummarize} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {summary && (
            <ScrollArea className="h-full">
              <div className="px-6 py-4 space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Summary
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm leading-relaxed">{summary.summary}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    {summary.messageCount} messages analyzed
                  </div>
                </div>

                <Separator />

                {/* Action Items */}
                {summary.actionItems && summary.actionItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-green-600" />
                      Action Items
                      <Badge variant="secondary">{summary.actionItems.length}</Badge>
                    </h3>
                    <div className="space-y-3">
                      {summary.actionItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg"
                        >
                          <CheckSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Points */}
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      Key Points
                      <Badge variant="secondary">{summary.keyPoints.length}</Badge>
                    </h3>
                    <div className="space-y-3">
                      {summary.keyPoints.map((point, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg"
                        >
                          <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {summary.topics && summary.topics.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-blue-600" />
                      Topics
                      <Badge variant="secondary">{summary.topics.length}</Badge>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.topics.map((topic, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/20 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* No content message */}
                {(!summary.actionItems || summary.actionItems.length === 0) &&
                  (!summary.keyPoints || summary.keyPoints.length === 0) &&
                  (!summary.topics || summary.topics.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">
                        No specific action items, key points, or topics were identified in this conversation.
                      </p>
                    </div>
                  )}

                {/* Regenerate button */}
                <div className="pt-4 border-t">
                  <Button onClick={handleRegenerate} disabled={isLoading} variant="outline" size="sm">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Summary
                      </>
                    )}
                  </Button>
                </div>

                {/* Bottom padding for scroll */}
                <div className="h-4" />
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
