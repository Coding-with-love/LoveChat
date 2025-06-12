"use client"

import { getAuthHeaders } from "@/lib/auth-headers"

// Define the AI action types
type AIAction = "explain" | "translate" | "rephrase" | "summarize"

// API call to process AI actions
const callAIAction = async (action: AIAction, text: string, targetLanguage?: string): Promise<string> => {
  try {
    // Get authentication headers
    const authHeaders = await getAuthHeaders()

    const response = await fetch("/api/ai-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        action,
        text,
        targetLanguage,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to process ${action}`)
    }

    const data = await response.json()
    return data.result
  } catch (error) {
    console.error(`Error in ${action} action:`, error)
    throw error
  }
}

// Export individual action functions
export const explain = (text: string): Promise<string> => {
  return callAIAction("explain", text)
}

export const translate = (text: string, targetLanguage: string): Promise<string> => {
  return callAIAction("translate", text, targetLanguage)
}

export const rephrase = (text: string): Promise<string> => {
  return callAIAction("rephrase", text)
}

export const summarize = (text: string): Promise<string> => {
  return callAIAction("summarize", text)
}
