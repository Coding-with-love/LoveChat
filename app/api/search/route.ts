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

    // Check for Serper API key
    const serperApiKey = process.env.SERPER_API_KEY
    if (!serperApiKey) {
      console.error("❌ SERPER_API_KEY not found in environment variables")
      return NextResponse.json({ error: "Search service not configured" }, { status: 500 })
    }

    // Use Serper API for Google search results
    const searchUrl = "https://google.serper.dev/search"

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": serperApiKey,
      },
      body: JSON.stringify({
        q: query,
        num: maxResults,
      }),
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data = await response.json()
    console.log("🔍 Serper API response:", JSON.stringify(data, null, 2))

    const results = []

    // Add organic search results
    if (data.organic && data.organic.length > 0) {
      data.organic.slice(0, maxResults).forEach((result: any) => {
        results.push({
          title: result.title || "Search Result",
          snippet: result.snippet || result.description || "",
          url: result.link || "#",
          source: result.domain || new URL(result.link || "https://example.com").hostname,
        })
      })
    }

    // Add knowledge graph if available
    if (data.knowledgeGraph && results.length < maxResults) {
      const kg = data.knowledgeGraph
      results.unshift({
        title: kg.title || "Knowledge Graph",
        snippet: kg.description || kg.descriptionSource || "",
        url: kg.descriptionLink || kg.website || "#",
        source: "Google Knowledge Graph",
      })
    }

    // Add answer box if available
    if (data.answerBox && results.length < maxResults) {
      const answer = data.answerBox
      results.unshift({
        title: answer.title || "Answer",
        snippet: answer.answer || answer.snippet || "",
        url: answer.link || "#",
        source: answer.source || "Google Answer Box",
      })
    }

    // If no results found, create a fallback
    if (results.length === 0) {
      results.push({
        title: `Search results for "${query}"`,
        snippet: `No specific results found for "${query}". Try refining your search query.`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        source: "Google",
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
