"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useTheme } from "next-themes"
import { useThemeStore } from "@/frontend/stores/ThemeStore"

export type ExportFormat = "markdown" | "pdf" | "txt"

export function useConversationExport() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { theme: darkMode } = useTheme()
  const { theme: colorTheme, customHue } = useThemeStore()

  const exportConversation = async (threadId: string, format: ExportFormat) => {
    setExporting(true)
    setError(null)

    try {
      // Get the current session for authentication
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.access_token) {
        throw new Error("Authentication required")
      }

      // Prepare theme information for PDF styling
      const themeInfo = {
        isDark: darkMode === "dark",
        colorTheme,
        customHue: colorTheme === "custom" ? customHue : null,
      }

      const response = await fetch("/api/export-conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ 
          threadId, 
          format,
          ...(format === "pdf" && { theme: themeInfo })
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to export conversation")
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get("content-disposition")
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `conversation.${format}`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      return true
    } catch (err) {
      console.error("Export error:", err)
      setError(err instanceof Error ? err.message : "Failed to export conversation")
      return false
    } finally {
      setExporting(false)
    }
  }

  return {
    exportConversation,
    exporting,
    error,
  }
}
