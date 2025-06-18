"use client"

import {
  ChevronDown,
  ExternalLink,
  Globe,
  Loader2,
  Search,
} from "lucide-react"
import { memo, useMemo, useState, useRef, useEffect } from "react"
import { Badge } from "@/frontend/components/ui/badge"
import { cn } from "@/lib/utils"

interface SearchResult {
  title: string
  snippet: string
  url: string
  source?: string
  domain?: string
  query?: string
}

interface WebSearchBannerProps {
  query?: string
  resultCount?: number
  searchResults?: SearchResult[]
  className?: string
  isStreaming?: boolean
}

function NonMemoizedWebSearchBanner({
  query = "Search Results",
  resultCount = 0,
  searchResults = [],
  className,
  isStreaming = false
}: WebSearchBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpanded = () => {
    setIsExpanded((expanded) => !expanded)
  }

  const isLoading = useMemo(() => {
    return isStreaming && (!searchResults || searchResults.length === 0)
  }, [isStreaming, searchResults])

  const finalResultCount = useMemo(() => {
    return searchResults ? searchResults.length : resultCount
  }, [searchResults, resultCount])

  // Don't render if no search results and not loading
  if (!isLoading && (!searchResults || searchResults.length === 0)) {
    return null
  }

  return (
    <div className={cn("py-2 w-full", className)}>
      <button
        onClick={toggleExpanded}
        className={cn(
          "group border-border text-muted-foreground flex items-center justify-between gap-2 rounded-full border px-4 py-2 w-full",
          "hover:bg-muted/20 transition-colors",
          isExpanded && "bg-muted/50"
        )}
      >
        <div className="rounded-lg">
          {isLoading ? (
            <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
          ) : (
            <Globe className="text-muted-foreground h-3 w-3" />
          )}
        </div>
        <span className="pr-4 text-sm">Search Results</span>
        <Badge variant="outline" className="rounded-full px-2 py-0 text-xs">
          <Search className="mr-1.5 h-3 w-3" />
          {finalResultCount} Results
        </Badge>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isExpanded ? "rotate-180" : ""
          )}
        />
      </button>
      
      <div
        className={cn(
          "flex flex-col gap-2 transition-all duration-300",
          isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        {/* Search Query Badge */}
        <div className="pt-4 pb-2">
          <Badge
            variant="outline"
            className="flex-shrink-0 rounded-full px-3 py-1.5"
          >
            <Search className="mr-1.5 h-3 w-3" />
            {query}
          </Badge>
        </div>

        {/* Horizontal scrolling results with wheel and drag support */}
        {searchResults && searchResults.length > 0 && (
          <HorizontalScrollContainer>
            {searchResults.map((result, resultIndex) => (
              <SearchResultCard key={`${result.url}-${resultIndex}`} result={result} />
            ))}
          </HorizontalScrollContainer>
        )}

        {/* Loading state */}
        {isLoading && (
          <HorizontalScrollContainer>
            {[1, 2, 3].map((index) => (
              <div 
                key={index} 
                className="bg-background border-border w-[300px] flex-shrink-0 rounded-xl border"
              >
                <div className="p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="bg-muted h-10 w-10 rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="bg-muted h-3 rounded animate-pulse" />
                      <div className="bg-muted h-2 w-3/4 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-muted h-2 rounded animate-pulse" />
                    <div className="bg-muted h-2 rounded animate-pulse" />
                    <div className="bg-muted h-2 w-2/3 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </HorizontalScrollContainer>
        )}
      </div>
    </div>
  )
}

function HorizontalScrollContainer({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Handle mouse wheel scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      e.preventDefault()
      e.stopPropagation()
      
      // Scroll horizontally with the wheel
      const scrollAmount = e.deltaY || e.deltaX
      scrollRef.current.scrollLeft += scrollAmount
    }
  }

  // Handle drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scrollRef.current) {
      setIsDragging(true)
      setStartX(e.pageX - scrollRef.current.offsetLeft)
      setScrollLeft(scrollRef.current.scrollLeft)
      scrollRef.current.style.cursor = 'grabbing'
      e.preventDefault()
    }
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 2 // Adjust scroll speed
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.style.cursor = 'grab'
      
      // Add passive: false to ensure preventDefault works
      const wheelHandler = (e: WheelEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        const scrollAmount = e.deltaY || e.deltaX
        scrollElement.scrollLeft += scrollAmount
      }
      
      scrollElement.addEventListener('wheel', wheelHandler, { passive: false })
      
      return () => {
        scrollElement.removeEventListener('wheel', wheelHandler)
      }
    }
  }, [])

  return (
    <div className="pb-4 w-full overflow-hidden">
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-4 overflow-x-auto no-scrollbar",
          "select-none w-full" // Prevent text selection during drag
        )}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE and Edge
        }}
      >
        <div className="flex gap-4 min-w-max">
          {children}
        </div>
      </div>
    </div>
  )
}

function NonMemoizedSearchResultCard({
  result,
}: {
  result: SearchResult
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const onImageLoad = () => {
    setImageLoaded(true)
    setImageFailed(false)
  }

  const onImageError = () => {
    setImageLoaded(true)
    setImageFailed(true)
  }

  // Extract domain from URL for favicon
  let domain = result.domain || result.source
  if (!domain && result.url) {
    try {
      domain = new URL(result.url).hostname
    } catch {
      domain = "example.com"
    }
  }

  return (
    <div className="bg-background border-border w-[300px] flex-shrink-0 rounded-xl border transition-all hover:shadow-md pointer-events-auto">
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="bg-muted relative flex min-h-10 min-w-10 items-center justify-center overflow-hidden rounded-lg">
            {!imageLoaded && (
              <div className="bg-muted-foreground/10 absolute inset-0 animate-pulse" />
            )}
            {!imageFailed ? (
              <img
                src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
                alt=""
                className={cn(
                  "h-6 w-6 object-contain",
                  !imageLoaded && "opacity-0"
                )}
                onLoad={onImageLoad}
                onError={onImageError}
                draggable={false}
              />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking links
            >
              <h3 className="line-clamp-1 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors no-underline">
                {result.title}
              </h3>
            </a>
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              {domain}
              <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>

        <p className="text-muted-foreground mb-3 line-clamp-3 text-sm leading-relaxed">
          {result.snippet}
        </p>
      </div>
    </div>
  )
}

const SearchResultCard = memo(
  NonMemoizedSearchResultCard,
  (prevProps, nextProps) => {
    if (prevProps.result.url !== nextProps.result.url) return false
    if (prevProps.result.title !== nextProps.result.title) return false
    if (prevProps.result.snippet !== nextProps.result.snippet) return false
    return true
  }
)

const WebSearchBanner = memo(NonMemoizedWebSearchBanner)

export default WebSearchBanner