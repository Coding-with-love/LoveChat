"use client"

import { useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

export function useStreamInterruption() {
  const activeStreamsRef = useRef<Set<string>>(new Set())
  const isUnloadingRef = useRef(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const registerStream = useCallback((messageId: string) => {
    console.log("🔵 [STREAM DEBUG] Registering stream:", messageId)
    console.log("🔵 [STREAM DEBUG] Current active streams before:", Array.from(activeStreamsRef.current))

    activeStreamsRef.current.add(messageId)

    console.log("🔵 [STREAM DEBUG] Current active streams after:", Array.from(activeStreamsRef.current))
    console.log("🔵 [STREAM DEBUG] Total active streams:", activeStreamsRef.current.size)

    // Store in sessionStorage as backup
    const activeStreams = Array.from(activeStreamsRef.current)
    sessionStorage.setItem("activeStreams", JSON.stringify(activeStreams))
    console.log("🔵 [STREAM DEBUG] Stored in sessionStorage:", activeStreams)

    // Also store with timestamp for debugging
    const debugInfo = {
      streams: activeStreams,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    }
    sessionStorage.setItem("activeStreamsDebug", JSON.stringify(debugInfo))
    console.log("🔵 [STREAM DEBUG] Debug info stored:", debugInfo)
  }, [])

  const unregisterStream = useCallback((messageId: string) => {
    console.log("🟡 [STREAM DEBUG] Unregistering stream:", messageId)
    console.log("🟡 [STREAM DEBUG] Current active streams before:", Array.from(activeStreamsRef.current))

    activeStreamsRef.current.delete(messageId)

    console.log("🟡 [STREAM DEBUG] Current active streams after:", Array.from(activeStreamsRef.current))
    console.log("🟡 [STREAM DEBUG] Remaining active streams:", activeStreamsRef.current.size)

    // Update sessionStorage
    const activeStreams = Array.from(activeStreamsRef.current)
    if (activeStreams.length > 0) {
      sessionStorage.setItem("activeStreams", JSON.stringify(activeStreams))
      console.log("🟡 [STREAM DEBUG] Updated sessionStorage:", activeStreams)
    } else {
      sessionStorage.removeItem("activeStreams")
      console.log("🟡 [STREAM DEBUG] Cleared sessionStorage (no active streams)")
    }
  }, [])

  const markStreamAsInterrupted = useCallback(async (messageId: string) => {
    try {
      console.log("🔴 [STREAM DEBUG] Marking stream as interrupted:", messageId)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log("🔴 [STREAM DEBUG] User check:", user ? `User ID: ${user.id}` : "No user found")

      if (!user) {
        console.log("🔴 [STREAM DEBUG] No user, cannot mark stream as interrupted")
        return
      }

      console.log("🔴 [STREAM DEBUG] Updating resumable_streams table for message:", messageId)

      // Mark any streaming status as paused for this message
      const { error, data } = await supabase
        .from("resumable_streams")
        .update({
          status: "paused",
          last_updated_at: new Date().toISOString(),
        })
        .eq("message_id", messageId)
        .eq("status", "streaming")
        .eq("user_id", user.id)
        .select()

      if (error) {
        console.error("🔴 [STREAM DEBUG] Failed to mark stream as interrupted:", error)
      } else {
        console.log("🔴 [STREAM DEBUG] Successfully marked stream as interrupted:", messageId)
        console.log("🔴 [STREAM DEBUG] Updated rows:", data)
      }
    } catch (error) {
      console.error("🔴 [STREAM DEBUG] Exception in markStreamAsInterrupted:", error)
    }
  }, [])

  const markAllActiveAsInterrupted = useCallback(async () => {
    const activeStreams = Array.from(activeStreamsRef.current)
    console.log("🔴 [STREAM DEBUG] Marking all active streams as interrupted:", activeStreams)

    if (activeStreams.length === 0) {
      console.log("🔴 [STREAM DEBUG] No active streams to mark as interrupted")
      return
    }

    for (const messageId of activeStreams) {
      console.log("🔴 [STREAM DEBUG] Processing stream for interruption:", messageId)
      await markStreamAsInterrupted(messageId)
    }

    console.log("🔴 [STREAM DEBUG] Finished marking all streams as interrupted")
  }, [markStreamAsInterrupted])

  // Check for previously interrupted streams on mount
  useEffect(() => {
    console.log("🟢 [STREAM DEBUG] useStreamInterruption hook mounted")

    const checkPreviouslyActiveStreams = async () => {
      try {
        console.log("🟢 [STREAM DEBUG] Checking for previously active streams...")

        const storedStreams = sessionStorage.getItem("activeStreams")
        const debugInfo = sessionStorage.getItem("activeStreamsDebug")

        console.log("🟢 [STREAM DEBUG] Raw sessionStorage activeStreams:", storedStreams)
        console.log("🟢 [STREAM DEBUG] Raw sessionStorage debug info:", debugInfo)

        if (storedStreams) {
          const streams = JSON.parse(storedStreams)
          console.log("🟢 [STREAM DEBUG] Found previously active streams:", streams)
          console.log("🟢 [STREAM DEBUG] Number of streams to mark as interrupted:", streams.length)

          if (debugInfo) {
            const debug = JSON.parse(debugInfo)
            console.log("🟢 [STREAM DEBUG] Previous session info:", debug)
            console.log(
              "🟢 [STREAM DEBUG] Time since last session:",
              new Date().getTime() - new Date(debug.timestamp).getTime(),
              "ms",
            )
          }

          // Mark these as interrupted since we're loading a new page
          for (const messageId of streams) {
            console.log("🟢 [STREAM DEBUG] Marking previously active stream as interrupted:", messageId)
            await markStreamAsInterrupted(messageId)
          }

          // Clear the stored streams
          sessionStorage.removeItem("activeStreams")
          sessionStorage.removeItem("activeStreamsDebug")
          console.log("🟢 [STREAM DEBUG] Cleared sessionStorage after processing")
        } else {
          console.log("🟢 [STREAM DEBUG] No previously active streams found in sessionStorage")
        }
      } catch (error) {
        console.error("🟢 [STREAM DEBUG] Error checking previously active streams:", error)
      }
    }

    checkPreviouslyActiveStreams()
  }, [markStreamAsInterrupted])

  useEffect(() => {
    console.log("🟢 [STREAM DEBUG] Setting up event listeners for interruption detection")

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log("🚨 [STREAM DEBUG] beforeunload event triggered!")
      console.log("🚨 [STREAM DEBUG] Current active streams:", Array.from(activeStreamsRef.current))
      console.log("🚨 [STREAM DEBUG] Event object:", event)

      isUnloadingRef.current = true

      const activeStreams = Array.from(activeStreamsRef.current)

      if (activeStreams.length === 0) {
        console.log("🚨 [STREAM DEBUG] No active streams to interrupt")
        return
      }

      console.log("🚨 [STREAM DEBUG] Attempting to mark streams as interrupted via beacon/fetch")

      // Use both beacon and fetch for reliability
      activeStreams.forEach((messageId, index) => {
        const payload = JSON.stringify({ messageId })
        console.log(`🚨 [STREAM DEBUG] Processing stream ${index + 1}/${activeStreams.length}:`, messageId)

        // Try beacon first (most reliable for page unload)
        if (navigator.sendBeacon) {
          console.log("🚨 [STREAM DEBUG] Attempting sendBeacon for:", messageId)
          const success = navigator.sendBeacon("/api/mark-interrupted", payload)
          console.log("🚨 [STREAM DEBUG] Beacon result for", messageId, "success:", success)
        } else {
          console.log("🚨 [STREAM DEBUG] sendBeacon not available")
        }

        // Fallback to synchronous fetch
        try {
          console.log("🚨 [STREAM DEBUG] Attempting fetch for:", messageId)
          fetch("/api/mark-interrupted", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          })
            .then((response) => {
              console.log("🚨 [STREAM DEBUG] Fetch response for", messageId, "status:", response.status)
            })
            .catch((error) => {
              console.error("🚨 [STREAM DEBUG] Fetch error for", messageId, ":", error)
            })
        } catch (error) {
          console.error("🚨 [STREAM DEBUG] Failed to send fetch request for", messageId, ":", error)
        }
      })

      console.log("🚨 [STREAM DEBUG] beforeunload processing complete")
    }

    const handleVisibilityChange = () => {
      console.log("👁️ [STREAM DEBUG] visibilitychange event triggered!")
      console.log("👁️ [STREAM DEBUG] Document visibility state:", document.visibilityState)
      console.log("👁️ [STREAM DEBUG] Is unloading:", isUnloadingRef.current)
      console.log("👁️ [STREAM DEBUG] Current active streams:", Array.from(activeStreamsRef.current))

      if (document.visibilityState === "hidden" && !isUnloadingRef.current) {
        // Only interrupt streams if we've been hidden for a significant time
        hideTimeoutRef.current = setTimeout(() => {
          console.log("👁️ [STREAM DEBUG] Page hidden for more than 5 seconds, marking active streams as interrupted")
          markAllActiveAsInterrupted()
        }, 5000) // Wait 5 seconds before interrupting
      } else if (document.visibilityState === "visible") {
        // Clear any pending interruption timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = null
        }
        console.log("👁️ [STREAM DEBUG] Page visible again, streams preserved")
      }
    }

    const handlePageHide = () => {
      console.log("📄 [STREAM DEBUG] pagehide event triggered!")
      console.log("📄 [STREAM DEBUG] Current active streams:", Array.from(activeStreamsRef.current))
      console.log("📄 [STREAM DEBUG] Marking active streams as interrupted")
      markAllActiveAsInterrupted()
    }

    const handleUnload = () => {
      console.log("🔄 [STREAM DEBUG] unload event triggered!")
      console.log("🔄 [STREAM DEBUG] Current active streams:", Array.from(activeStreamsRef.current))
    }

    // Add multiple event listeners for better coverage
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("unload", handleUnload)
    window.addEventListener("pagehide", handlePageHide)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    console.log("🟢 [STREAM DEBUG] Event listeners registered")

    return () => {
      console.log("🟢 [STREAM DEBUG] Cleaning up event listeners")
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("unload", handleUnload)
      window.removeEventListener("pagehide", handlePageHide)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      
      // Clean up any pending timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
    }
  }, [markAllActiveAsInterrupted])

  return {
    registerStream,
    unregisterStream,
    markStreamAsInterrupted,
  }
}
