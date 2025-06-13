import { supabaseServer } from "./supabase/server"
import { StreamProtection } from "./stream-protection"

export interface ResumableStream {
  id: string
  thread_id: string
  user_id: string
  message_id: string
  status: "active" | "paused" | "completed" | "failed"
  partial_content: string
  last_chunk_at: string
  created_at: string
  completed_at: string | null
  error_message: string | null
}

// In-memory store for active streams
const activeStreams = new Map<
  string,
  {
    controller: ReadableStreamDefaultController
    content: string
    lastActivity: number
    messageId: string
  }
>()

// Cleanup inactive streams every 5 minutes
setInterval(() => {
  const now = Date.now()
  const timeout = 5 * 60 * 1000 // 5 minutes

  for (const [streamId, stream] of activeStreams.entries()) {
    if (now - stream.lastActivity > timeout) {
      console.log(`🧹 Cleaning up inactive stream: ${streamId}`)
      try {
        stream.controller.close()
      } catch (error) {
        // Stream might already be closed
      }
      activeStreams.delete(streamId)
    }
  }
}, 60000) // Check every minute

export class CustomResumableStream {
  private streamId: string
  private threadId: string
  private userId: string
  private messageId: string
  private content = ""
  private controller: ReadableStreamDefaultController | null = null
  private isActive = false
  private streamProtection: StreamProtection | null = null

  constructor(streamId: string, threadId: string, userId: string, messageId: string, initialContent = "") {
    this.streamId = streamId
    this.threadId = threadId
    this.userId = userId
    this.messageId = messageId
    this.content = initialContent
    
    // Initialize stream protection
    this.streamProtection = new StreamProtection({
      maxRepetitions: 5,
      repetitionWindowSize: 80,
      maxResponseLength: 50000,
      timeoutMs: 120000,
      maxSimilarChunks: 8,
    })
  }

  async create(): Promise<ReadableStream> {
    // Store stream in database
    await this.saveToDatabase("active")

    const stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller
        this.isActive = true

        // If we have initial content, send it first
        if (this.content) {
          console.log(`📤 Sending initial content: ${this.content.length} characters`)
          controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(this.content)}\n`))
        }

        // Store in memory for resumption
        activeStreams.set(this.streamId, {
          controller,
          content: this.content,
          lastActivity: Date.now(),
          messageId: this.messageId,
        })

        console.log(`🚀 Created resumable stream: ${this.streamId}`)
      },
      cancel: () => {
        this.pause()
      },
    })

    return stream
  }

  async write(chunk: string): Promise<void> {
    if (!this.isActive || !this.controller) return

    try {
      // Check with stream protection first
      if (this.streamProtection) {
        const protectionResult = this.streamProtection.analyzeChunk(chunk)
        
        if (!protectionResult.allowed) {
          console.warn(`🛡️ Resumable stream protection triggered for ${this.streamId}:`, protectionResult.reason)
          console.log("📊 Resumable stream stats:", this.streamProtection.getStats())
          
          // Send error message and terminate
          const errorMsg = `\n\n[Stream interrupted: ${protectionResult.reason}. Please try again with a different approach.]`
          this.controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(errorMsg)}\n`))
          await this.fail(protectionResult.reason || 'Stream protection triggered')
          return
        }
      }

      this.content += chunk

      // Update in-memory store
      const activeStream = activeStreams.get(this.streamId)
      if (activeStream) {
        activeStream.content = this.content
        activeStream.lastActivity = Date.now()
      }

      // Write to stream
      this.controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(chunk)}\n`))

      // Periodically save to database (every 100 characters or so)
      if (this.content.length % 100 === 0) {
        await this.saveToDatabase("active")
      }
    } catch (error) {
      console.error(`Error writing to stream ${this.streamId}:`, error)
      await this.fail((error as Error)?.message || 'Unknown error')
    }
  }

  async complete(): Promise<void> {
    if (!this.isActive) return

    try {
      // Send completion signal
      if (this.controller) {
        this.controller.enqueue(new TextEncoder().encode(`0:""\n`))
        this.controller.close()
      }

      this.isActive = false
      activeStreams.delete(this.streamId)
      await this.saveToDatabase("completed")

      console.log(`✅ Completed stream: ${this.streamId}`)

      // Clean up completed stream after a delay to allow for potential resume attempts
      setTimeout(async () => {
        try {
          await supabaseServer.from("resumable_streams").delete().eq("id", this.streamId)
          console.log(`🧹 Cleaned up completed stream: ${this.streamId}`)
        } catch (error) {
          console.error(`Failed to clean up stream ${this.streamId}:`, error)
        }
      }, 30000) // Clean up after 30 seconds
    } catch (error) {
      console.error(`Error completing stream ${this.streamId}:`, error)
    }
  }

  async pause(): Promise<void> {
    if (!this.isActive) return

    this.isActive = false
    activeStreams.delete(this.streamId)
    await this.saveToDatabase("paused")

    console.log(`⏸️ Paused stream: ${this.streamId}`)
  }

  async fail(errorMessage: string): Promise<void> {
    if (this.controller) {
      try {
        this.controller.error(new Error(errorMessage))
      } catch (error) {
        // Controller might already be closed
      }
    }

    this.isActive = false
    activeStreams.delete(this.streamId)
    await this.saveToDatabase("failed", errorMessage)

    console.log(`❌ Failed stream: ${this.streamId} - ${errorMessage}`)
  }

  private async saveToDatabase(status: ResumableStream["status"], errorMessage?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        partial_content: this.content,
        last_chunk_at: new Date().toISOString(),
      }

      if (status === "completed") {
        updateData.completed_at = new Date().toISOString()
      }

      if (errorMessage) {
        updateData.error_message = errorMessage
      }

      await supabaseServer.from("resumable_streams").update(updateData).eq("id", this.streamId)
    } catch (error) {
      console.error(`Failed to save stream ${this.streamId} to database:`, error)
    }
  }

  static async resume(streamId: string): Promise<ReadableStream | null> {
    console.log(`🔄 Attempting to resume stream: ${streamId}`)

    // Check if stream is active in memory
    const activeStream = activeStreams.get(streamId)
    if (activeStream) {
      console.log(`✅ Found active stream in memory: ${streamId}`)

      // Create a new stream that sends the existing content and closes
      return new ReadableStream({
        start(controller) {
          // Send existing content
          if (activeStream.content) {
            controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(activeStream.content)}\n`))
          }
          // Send completion signal
          controller.enqueue(new TextEncoder().encode(`0:""\n`))
          controller.close()
        },
      })
    }

    // Check database for paused/completed streams
    try {
      const { data: streamData, error } = await supabaseServer
        .from("resumable_streams")
        .select("*")
        .eq("id", streamId)
        .single()

      if (error || !streamData) {
        console.log(`❌ Stream not found in database: ${streamId}`)
        return null
      }

      console.log(`📋 Found stream in database:`, {
        id: streamData.id,
        status: streamData.status,
        contentLength: streamData.partial_content?.length || 0,
      })

      if (streamData.status === "completed") {
        console.log(`✅ Stream already completed: ${streamId}`)

        // Return the completed content
        return new ReadableStream({
          start(controller) {
            if (streamData.partial_content) {
              // Send the full content as one chunk
              controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(streamData.partial_content)}\n`))
            }
            controller.enqueue(new TextEncoder().encode(`0:""\n`))
            controller.close()
          },
        })
      }

      if (streamData.status === "paused") {
        console.log(`🔄 Resuming paused stream: ${streamId}`)

        // Mark as completed and return the content
        await supabaseServer
          .from("resumable_streams")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", streamId)

        return new ReadableStream({
          start(controller) {
            if (streamData.partial_content) {
              // Send the full content as one chunk
              controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(streamData.partial_content)}\n`))
            }
            controller.enqueue(new TextEncoder().encode(`0:""\n`))
            controller.close()
          },
        })
      }

      console.log(`⚠️ Cannot resume stream with status: ${streamData.status}`)
      return null
    } catch (error) {
      console.error(`Error resuming stream ${streamId}:`, error)
      return null
    }
  }

  static async createNew(
    threadId: string,
    userId: string,
    messageId?: string,
    initialContent = "",
  ): Promise<CustomResumableStream> {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Save to database
    await supabaseServer.from("resumable_streams").insert({
      id: streamId,
      thread_id: threadId,
      user_id: userId,
      message_id: msgId,
      status: "active",
      partial_content: initialContent,
      last_chunk_at: new Date().toISOString(),
    })

    return new CustomResumableStream(streamId, threadId, userId, msgId, initialContent)
  }

  static async getActiveStreamsForThread(threadId: string): Promise<string[]> {
    try {
      const { data, error } = await supabaseServer
        .from("resumable_streams")
        .select("id")
        .eq("thread_id", threadId)
        .in("status", ["active", "paused"])
        .order("created_at", { ascending: false })

      if (error) throw error
      return data?.map((s) => s.id) || []
    } catch (error) {
      console.error("Error getting active streams:", error)
      return []
    }
  }

  static async cleanup(olderThanHours = 24): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString()

      const { error } = await supabaseServer
        .from("resumable_streams")
        .delete()
        .lt("created_at", cutoffTime)
        .in("status", ["completed", "failed"])

      if (error) throw error
      console.log(`🧹 Cleaned up old resumable streams older than ${olderThanHours} hours`)
    } catch (error) {
      console.error("Error cleaning up old streams:", error)
    }
  }
}
