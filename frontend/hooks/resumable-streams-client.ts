"use client"

import { apiClient } from "@/lib/api-client"

export async function getActiveStreamsForThread(threadId: string): Promise<string[]> {
  try {
    console.log("🔍 Fetching active streams for thread:", threadId)

    // Use the apiClient get method instead of fetch
    const data = await apiClient.get<{ streams: string[] }>(`/api/resumable-streams?threadId=${threadId}`)

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

    // For streaming responses, we need to use the native fetch with auth headers
    const { getAuthHeaders } = await import("@/lib/auth-headers")
    const headers = await getAuthHeaders()

    const response = await fetch(`/api/resume-stream?streamId=${streamId}`, {
      method: "GET",
      headers,
    })

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
