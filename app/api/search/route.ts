import { type NextRequest, NextResponse } from "next/server"
import { getUserFromHeaders } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    console.log("🔍 Web search API called")

    // Verify authentication
    const user = getUserFromHeaders(req)
    if (!user) {
      console.log("❌ No user found in search endpoint")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { query, maxResults = 5 } = await req.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    console.log("🔍 Searching for:", query)

    // Use DuckDuckGo Instant Answer API (free, no API key required)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "LoveChat/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`)
    }

    const data = await response.json()

    // Also search for web results using a different approach
    const webSearchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    // For now, we'll use the instant answer API and format the results
    const results = []

    // Add instant answer if available
    if (data.Abstract) {
      results.push({
        title: data.Heading || "Instant Answer",
        snippet: data.Abstract,
        url: data.AbstractURL || "#",
        source: data.AbstractSource || "DuckDuckGo",
      })
    }

    // Add related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, maxResults - results.length).forEach((topic: any) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(" - ")[0] || "Related Topic",
            snippet: topic.Text,
            url: topic.FirstURL,
            source: "DuckDuckGo",
          })
        }
      })
    }

    // If no results from instant answer, create a fallback result
    if (results.length === 0) {
      results.push({
        title: `Search results for "${query}"`,
        snippet: `I searched for "${query}" but couldn't find specific instant answers. You may want to search directly on the web for more detailed results.`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        source: "DuckDuckGo",
      })
    }

    console.log("✅ Search completed, found", results.length, "results")

    return NextResponse.json({
      query,
      results: results.slice(0, maxResults),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("💥 Search API error:", error)
    return NextResponse.json({ error: "Failed to perform web search" }, { status: 500 })
  }
}
