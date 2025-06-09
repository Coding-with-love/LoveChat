"use client"

import { apiClient } from "@/lib/api-client"

export async function getActiveStreamsForThread(threadId: string): Promise<string[]> {
  try {
    console.log("🔍 Fetching active streams for thread:", threadId)

    // Use the apiClient which handles auth tokens properly
    const response = await apiClient.fetch(`/api/resumable-streams?threadId=${threadId}`)

    if (!response.ok) {
      console.error("❌ Failed to fetch streams:", response.statusText)
      return []
    }

    const data = await response.json()
    console.log("📋 Active streams response:", data)
    return data.streams || []
  } catch (error) {
    console.error("❌ Error fetching active streams:", error)
    return []
  }
}

export async function resumeStream(streamId: string): Promise<ReadableStream | null> {
  try {
    console.log("🔄 Attempting to resume stream:", streamId)

    // Use the apiClient which handles auth tokens properly
    const response = await apiClient.fetch(`/api/resume-stream?streamId=${streamId}`)

    if (!response.ok) {
      console.error("❌ Failed to resume stream:", response.statusText)
      return null
    }

    if (!response.body) {
      console.error("❌ No response body")
      return null
    }

    console.log("✅ Stream resumed successfully")
    return response.body
  } catch (error) {
    console.error("❌ Error resuming stream:", error)
    return null
  }
}
