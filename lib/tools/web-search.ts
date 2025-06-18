import { tool } from "ai"
import { z } from "zod"

// Types based on Serper API response
export type SearchResult = {
  searchParameters: SearchParameters;
  knowledgeGraph?: KnowledgeGraph;
  organic: OrganicResult[];
  answerBox?: AnswerBox;
  credits: number;
};

export type SearchParameters = {
  q: string;
  type: string;
  engine: string;
};

export type KnowledgeGraph = {
  title: string;
  type?: string;
  website?: string;
  description?: string;
  descriptionSource?: string;
  descriptionLink?: string;
  attributes?: {
    [key: string]: string;
  };
};

export type OrganicResult = {
  title: string;
  link: string;
  snippet: string;
  sitelinks?: Sitelink[];
  position: number;
  domain?: string;
};

export type AnswerBox = {
  title?: string;
  answer?: string;
  snippet?: string;
  link?: string;
  source?: string;
};

export type Sitelink = {
  title: string;
  link: string;
};

export type ConciseSearchResult = {
  query: string;
  results: {
    url: string;
    title: string;
    content: string;
    domain: string;
  }[];
};

function extractActualUrl(url: string): string {
  try {
    // Handle Google's intermediate URLs
    if (url.includes('vertexaisearch.cloud.google.com') || url.includes('google.com/url')) {
      const urlObj = new URL(url)
      
      // Check for 'url' parameter (common in Google redirects)
      const actualUrl = urlObj.searchParams.get('url') || 
                       urlObj.searchParams.get('q') ||
                       urlObj.searchParams.get('u')
      
      if (actualUrl) {
        return decodeURIComponent(actualUrl)
      }
    }
    
    return url
  } catch (error) {
    console.error("Error extracting actual URL:", error)
    return url
  }
}

function extractDomainFromUrl(url: string): string {
  try {
    const actualUrl = extractActualUrl(url)
    
    // If it's still a Google intermediate URL, return fallback
    if (actualUrl.includes('vertexaisearch.cloud.google.com') || actualUrl.includes('google.com/url')) {
      return "Search Result"
    }
    
    const urlObj = new URL(actualUrl)
    let hostname = urlObj.hostname
    
    // Remove 'www.' prefix for cleaner display
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    
    return hostname
  } catch (error) {
    console.error("Error extracting domain:", error)
    return "unknown"
  }
}

function inferDomainFromTitle(title: string): string {
  // Check for known platforms
  if (title.toLowerCase().includes('youtube')) return 'youtube.com'
  if (title.toLowerCase().includes('github')) return 'github.com'
  if (title.toLowerCase().includes('twitter') || title.toLowerCase().includes(' x ')) return 'x.com'
  if (title.toLowerCase().includes('linkedin')) return 'linkedin.com'
  if (title.toLowerCase().includes('reddit')) return 'reddit.com'
  if (title.toLowerCase().includes('stackoverflow')) return 'stackoverflow.com'
  if (title.toLowerCase().includes('wikipedia')) return 'wikipedia.org'
  if (title.toLowerCase().includes('t3.gg') || title.toLowerCase().includes('t3')) return 't3.gg'
  
  // Try to extract from title patterns
  const patterns = [
    /^(.+?)\s*-\s*(YouTube|Twitter|GitHub|LinkedIn|Facebook|Instagram|TikTok|Reddit)/i,
    /^(.+?)\s*\|\s*(.+)$/,
    /(.+?)\s*-\s*(.+)$/,
  ]
  
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match && match[2]) {
      const domain = match[2].toLowerCase().trim()
      if (domain.includes('.') || domain.length < 20) {
        return domain.includes('.') ? domain : `${domain}.com`
      }
    }
  }
  
  return "Search Result"
}

const extractDomain = (url: string): string => {
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return url.match(urlPattern)?.[1] || url;
};

const deduplicateByDomainAndUrl = <T extends { url: string }>(
  items: T[]
): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();

  return items.filter((item) => {
    const domain = extractDomain(item.url);
    const isNewUrl = !seenUrls.has(item.url);
    const isNewDomain = !seenDomains.has(domain);

    if (isNewUrl && isNewDomain) {
      seenUrls.add(item.url);
      seenDomains.add(domain);
      return true;
    }
    return false;
  });
};

// Tool named "search" to match the UI components
export const search = tool({
  description: "Search the web for information with one or more queries. Ask the user for more information if needed before using this tool.",
  parameters: z.object({
    queries: z
      .array(z.string())
      .describe("Array of search queries to look up on the web"),
  }),
  execute: async ({ queries }, { toolCallId, writer }) => {
    try {
      console.log("🔍 Executing web search for queries:", queries)

      // Check for Serper API key
      const serperApiKey = process.env.SERPER_API_KEY
      if (!serperApiKey) {
        throw new Error("Serper API key not configured")
      }

      const promises = queries.map(async (query, index) => {
        // Add delay between requests to avoid rate limiting
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (index + 1))
        );

        const parameters = {
          q: query,
          apiKey: serperApiKey,
        };
        const queryString = new URLSearchParams(parameters).toString();
        const response = await fetch(
          "https://google.serper.dev/search?" + queryString
        );

        if (!response.ok) {
          throw new Error(`Serper API error: ${response.status}`)
        }

        const data: SearchResult = await response.json();
        console.log("🔍 Raw Serper API response for query:", query, JSON.stringify(data, null, 2))

        // Write search completion annotation for UI components
        try {
          writer?.writeMessageAnnotation({
            type: "search_completion",
            data: {
              query,
              index,
              status: "completed",
              resultsCount: data.organic?.length ?? 0,
              toolCallId,
            },
          });
        } catch (annotationError) {
          console.warn("Failed to write search annotation:", annotationError)
        }

        // Process organic results with enhanced URL and domain extraction
        const processedResults = (data.organic || []).map((result) => {
          const actualUrl = extractActualUrl(result.link)
          let domain = extractDomainFromUrl(actualUrl)
          
          // If we couldn't extract a proper domain from URL, try the provided domain or infer from title
          if (domain === "Search Result" || domain === "unknown") {
            domain = result.domain || inferDomainFromTitle(result.title || "") || "unknown"
          }
          
          console.log("🔍 Processing result:", {
            originalUrl: result.link,
            actualUrl: actualUrl,
            domain: domain,
            title: result.title
          })
          
          return {
            url: actualUrl,
            title: result.title,
            content: result.snippet,
            domain: domain
          }
        })

        // Add answer box if available
        if (data.answerBox) {
          const answer = data.answerBox
          const actualUrl = extractActualUrl(answer.link || "#")
          const domain = extractDomainFromUrl(actualUrl) || answer.source || "Google Answer Box"
          
          processedResults.unshift({
            url: actualUrl,
            title: answer.title || "Answer",
            content: answer.answer || answer.snippet || "",
            domain: domain
          })
        }

        // Add knowledge graph if available
        if (data.knowledgeGraph) {
          const kg = data.knowledgeGraph
          const actualUrl = extractActualUrl(kg.descriptionLink || kg.website || "#")
          const domain = extractDomainFromUrl(actualUrl) || "Google Knowledge Graph"
          
          processedResults.unshift({
            url: actualUrl,
            title: kg.title || "Knowledge Graph",
            content: kg.description || kg.descriptionSource || "",
            domain: domain
          })
        }

        return {
          query: data.searchParameters?.q || query,
          results: deduplicateByDomainAndUrl(processedResults),
        };
      });

      const searches = await Promise.all(promises);

      console.log("✅ Web search completed for all queries")
      console.log("🔍 Final search results:", searches.map(s => ({ 
        query: s.query, 
        resultsCount: s.results.length,
        results: s.results.map(r => ({ title: r.title, url: r.url, domain: r.domain }))
      })))

      // Store sources in global variable for fallback
      const allResults = searches.flatMap(search => 
        search.results.map(result => ({
          title: result.title,
          snippet: result.content,
          url: result.url,
          source: result.domain,
          domain: result.domain,
          query: search.query
        }))
      )

      global.lastSearchSources = allResults
      global.lastSearchQuery = queries.join(", ")

      console.log("🔗 Stored sources globally as fallback:", {
        sourcesCount: allResults.length,
        queries: queries,
        sourcesPreview: allResults.slice(0, 2).map(s => ({ title: s.title, url: s.url, domain: s.domain }))
      })

      return searches;
    } catch (error) {
      console.error("💥 Web search tool error:", error)
      
      // Write error annotation for UI components
      try {
        writer?.writeMessageAnnotation({
          type: "search_error",
          data: {
            queries,
            toolCallId,
            status: "error",
            error: error instanceof Error ? error.message : String(error)
          },
        })
      } catch (annotationError) {
        console.warn("Failed to write error annotation:", annotationError)
      }

      // Clear global sources on error
      global.lastSearchSources = []
      global.lastSearchQuery = null
      
      throw error
    }
  },
})

// Keep the old export for backward compatibility
export const webSearchTool = search

// Type declarations for global variables
declare global {
  var lastSearchSources: any[]
  var lastSearchQuery: string | null
} 