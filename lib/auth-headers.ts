"use client"

import { supabase } from "@/lib/supabase/client"

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    console.log("🔑 Getting auth headers...")

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    console.log("🎫 Session check:", {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length,
      error: error?.message,
    })

    if (error) {
      console.error("Failed to get session:", error)
      throw new Error("Authentication failed")
    }

    if (!session?.access_token) {
      throw new Error("No authentication token available")
    }

    const headers = {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    }

    console.log("📋 Headers created with token length:", session.access_token.length)
    return headers
  } catch (error) {
    console.error("Failed to get auth headers:", error)
    throw error
  }
}
