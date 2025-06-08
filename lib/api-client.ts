"use client"

import { supabase } from "./supabase/client"
import { toast } from "sonner"

// Create a client for making authenticated API calls
export const apiClient = {
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      console.log("🔑 API Client: Preparing request to", url)

      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Failed to get session:", sessionError)
        throw new Error("Authentication failed")
      }

      if (!session?.access_token) {
        console.log("🔄 No token found, trying to refresh session...")

        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          console.error("Failed to refresh session:", refreshError)
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

      // Add authorization header
      const headers = new Headers(options.headers || {})
      headers.set("authorization", `Bearer ${currentSession.access_token}`)
      headers.set("content-type", "application/json")

      console.log("📋 API Client: Headers prepared with token length:", currentSession.access_token.length)

      // Make the request
      const response = await fetch(url, {
        ...options,
        headers,
      })

      console.log("📡 API Client: Response status:", response.status)

      return response
    } catch (error) {
      console.error("API Client error:", error)
      toast.error(error instanceof Error ? error.message : "API request failed")
      throw error
    }
  },

  async post<T = any>(url: string, data: any, options: Omit<RequestInit, "body" | "method"> = {}): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || "Request failed")
    }

    return response.json()
  },
}
