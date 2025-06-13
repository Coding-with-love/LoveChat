"use client"

import { useEffect } from "react"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import { useAuth } from "@/frontend/components/AuthProvider"

export function useArtifacts(threadId?: string) {
  const { user } = useAuth()
  const { artifacts, isLoading, error, fetchArtifacts, getArtifactsByThread, getPinnedArtifacts, getRecentArtifacts } =
    useArtifactStore()

  // Fetch all artifacts on mount if user is authenticated
  useEffect(() => {
    if (user && artifacts.length === 0 && !isLoading) {
      console.log("🎯 Fetching all artifacts for user")
      fetchArtifacts()
    }
  }, [user, artifacts.length, isLoading, fetchArtifacts])

  // Fetch thread-specific artifacts when threadId changes
  useEffect(() => {
    if (user && threadId) {
      console.log("🎯 Fetching artifacts for thread:", threadId)
      fetchArtifacts({ threadId })
    }
  }, [user, threadId, fetchArtifacts])

  const threadArtifacts = threadId ? getArtifactsByThread(threadId) : []
  const pinnedArtifacts = getPinnedArtifacts()
  const recentArtifacts = getRecentArtifacts(10)

  return {
    artifacts,
    threadArtifacts,
    pinnedArtifacts,
    recentArtifacts,
    isLoading,
    error,
    refetch: () => fetchArtifacts(threadId ? { threadId } : {}),
  }
}
