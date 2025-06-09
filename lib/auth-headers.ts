"use client"

import { supabase } from "./supabase/client"

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    console.log("🔑 Getting auth headers...")

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("❌ Session error:", sessionError)
      throw new Error("Failed to get session")
    }

    if (!session?.access_token) {
      console.log("🔄 No token found, trying to refresh session...")

      // Try to refresh the session
      const { error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        console.error("❌ Failed to refresh session:", refreshError)
        throw new Error("Session expired. Please sign in again.")
      }

      // Get the refreshed session
      const {
        data: { session: refreshedSession },
      } = await supabase.auth.getSession()

      if (!refreshedSession?.access_token) {
        throw new Error("No authentication token available after refresh")
      }

      console.log("✅ Session refreshed successfully")
    }

    // Get the latest session after potential refresh
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()

    if (!currentSession?.access_token) {
      throw new Error("No authentication token available")
    }

    console.log("🔑 Auth headers prepared with token length:", currentSession.access_token.length)
    console.log("🔑 Token preview:", currentSession.access_token.substring(0, 20) + "...")

    return {
      authorization: `Bearer ${currentSession.access_token}`,
      "content-type": "application/json",
    }
  } catch (error) {
    console.error("❌ Failed to get auth headers:", error)
    throw error
  }
}
