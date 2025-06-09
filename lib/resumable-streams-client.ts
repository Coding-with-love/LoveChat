"use client"

// Simple client-side functions to interact with resumable streams
export async function getActiveStreamsForThread(threadId: string): Promise<string[]> {
  try {
    console.log("🔍 Fetching active streams for thread:", threadId)
    const response = await fetch(`/api/resumable-streams?threadId=${threadId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch streams: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("📋 Active streams found:", data.streams)
    return data.streams || []
  } catch (error) {
    console.error("❌ Error fetching active streams:", error)
    return []
  }
}

export async function resumeStream(streamId: string): Promise<ReadableStream | null> {
  try {
    console.log("🔄 Attempting to resume stream:", streamId)
    const response = await fetch(`/api/resume-stream?streamId=${streamId}`)

    if (!response.ok) {
      throw new Error(`Failed to resume stream: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error("No response body")
    }

    console.log("✅ Stream resumed successfully")
    return response.body
  } catch (error) {
    console.error("❌ Error resuming stream:", error)
    return null
  }
}
