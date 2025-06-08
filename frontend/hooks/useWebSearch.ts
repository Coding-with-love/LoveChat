"use client"

import { useState, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface SearchResult {
  title: string
  snippet: string
  url: string
  source: string
}

interface SearchResponse {
  query: string
  results: SearchResult[]
  timestamp: string
}

export function useWebSearch() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [lastQuery, setLastQuery] = useState("")

  const search = useCallback(async (query: string, maxResults = 5): Promise<SearchResponse | null> => {
    if (!query.trim()) return null

    setLoading(true)
    try {
      console.log("🔍 Performing web search for:", query)

      const response = await apiClient.post<SearchResponse>("/api/search", {
        query: query.trim(),
        maxResults,
      })

      setResults(response.results)
      setLastQuery(query)

      return response
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Failed to perform web search")
      setResults([])
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setLastQuery("")
  }, [])

  return {
    search,
    loading,
    results,
    lastQuery,
    clearResults,
  }
}
