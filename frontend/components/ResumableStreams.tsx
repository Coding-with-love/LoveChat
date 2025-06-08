"use client"

import { Button } from "@/frontend/components/ui/button"
import { Clock, Play } from "lucide-react"
import { useResumableStreams } from "@/frontend/hooks/useResumableStreams"
import { formatDistanceToNow } from "date-fns"

interface ResumableStreamsProps {
  onResumeStream: (streamId: string, threadId: string, messageId: string) => void
  className?: string
}

export function ResumableStreams({ onResumeStream, className }: ResumableStreamsProps) {
  const { pausedStreams, loading, resumingId, resumeStream } = useResumableStreams()

  if (loading) {
    return (
      <div className={`p-2 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-10 bg-muted rounded-md"></div>
          <div className="h-10 bg-muted rounded-md"></div>
        </div>
      </div>
    )
  }

  if (pausedStreams.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 p-2 ${className}`}>
      {pausedStreams.map((stream) => (
        <div
          key={stream.id}
          className="flex items-center justify-between rounded-md border p-2 text-sm bg-yellow-50/50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
        >
          <div className="flex flex-col gap-1 overflow-hidden">
            <div className="font-medium truncate">{stream.threads?.title || "Untitled conversation"}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Interrupted {formatDistanceToNow(new Date(stream.last_updated_at), { addSuffix: true })}
            </div>
            {stream.partial_content && (
              <div className="text-xs text-muted-foreground truncate">"{stream.partial_content.slice(0, 50)}..."</div>
            )}
          </div>
          <Button
            size="sm"
            variant="default"
            className="ml-2 h-8 px-3 flex-shrink-0"
            disabled={!!resumingId}
            onClick={() => {
              resumeStream(stream.id)
              onResumeStream(stream.id, stream.thread_id, stream.message_id)
            }}
          >
            <Play className="h-3 w-3 mr-1" />
            {resumingId === stream.id ? "Resuming..." : "Resume"}
          </Button>
        </div>
      ))}
    </div>
  )
}
