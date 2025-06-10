"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Message } from "@/lib/supabase/types"

interface SearchResult {
  message: Message
  snippet: string
  matchIndex: number
}

export function useChatSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentResultIndex, setCurrentResultIndex] = useState(-1)

  const toggleSearch = useCallback(() => {
    setIsSearchVisible((prev) => !prev)
    if (isSearchVisible) {
      setSearchQuery("")
      setSearchResults([])
      setCurrentResultIndex(-1)
    }
  }, [isSearchVisible])

  const searchMessages = useCallback(async (query: string, threadId: string) => {
    if (!query.trim() || !threadId) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Search error:", error)
        return
      }

      const results: SearchResult[] = []
      const searchTerm = query.toLowerCase()

      messages?.forEach((message) => {
        const content = message.content.toLowerCase()
        const matchIndex = content.indexOf(searchTerm)

        if (matchIndex !== -1) {
          // Create a snippet around the match
          const start = Math.max(0, matchIndex - 50)
          const end = Math.min(content.length, matchIndex + searchTerm.length + 50)
          let snippet = message.content.substring(start, end)

          if (start > 0) snippet = "..." + snippet
          if (end < content.length) snippet = snippet + "..."

          results.push({
            message,
            snippet,
            matchIndex,
          })
        }
      })

      setSearchResults(results)
      setCurrentResultIndex(results.length > 0 ? 0 : -1)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearch = useCallback(
    (query: string, threadId?: string) => {
      setSearchQuery(query)
      if (threadId) {
        searchMessages(query, threadId)
      }
    },
    [searchMessages],
  )

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setSearchResults([])
    setCurrentResultIndex(-1)
  }, [])

  const navigateToResult = useCallback(
    (index: number) => {
      if (index >= 0 && index < searchResults.length) {
        setCurrentResultIndex(index)
        return searchResults[index].message.id
      }
      return null
    },
    [searchResults],
  )

  const nextResult = useCallback(() => {
    const nextIndex = (currentResultIndex + 1) % searchResults.length
    return navigateToResult(nextIndex)
  }, [currentResultIndex, searchResults.length, navigateToResult])

  const previousResult = useCallback(() => {
    const prevIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1
    return navigateToResult(prevIndex)
  }, [currentResultIndex, searchResults.length, navigateToResult])

  return {
    searchQuery,
    isSearchVisible,
    searchResults,
    isSearching,
    currentResultIndex,
    toggleSearch,
    handleSearch,
    clearSearch,
    navigateToResult,
    nextResult,
    previousResult,
  }
}
