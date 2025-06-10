"use client"

import { useState } from "react"

export type ExportFormat = "markdown" | "pdf" | "txt"

export function useConversationExport() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportConversation = async (threadId: string, format: ExportFormat) => {
    setExporting(true)
    setError(null)

    try {
      const response = await fetch("/api/export-conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ threadId, format }),
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
