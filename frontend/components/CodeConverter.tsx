"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Code2, Loader2, ChevronDown, Search, History, RefreshCw } from 'lucide-react'
import { cn } from "@/lib/utils"
import {
  CONVERSION_TARGETS,
  detectLanguageFromCode,
  detectFrameworkFromCode,
  type ConversionTarget,
} from "@/lib/code-conversion"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { toast } from "sonner"
import { getAuthHeaders } from "@/lib/auth-headers"
import { useState as useReactState, useEffect as useReactEffect } from "react"

interface CodeConversion {
  id: string
  thread_id: string
  message_id: string
  user_id: string
  original_code: string
  original_language: string
  converted_code: string
  target_language: string
  created_at: string
}

interface CodeConverterProps {
  code: string
  currentLanguage?: string
  onConvert: (convertedCode: string, target: string) => void
  className?: string
  threadId?: string
  messageId?: string
}

type TabType = "new" | "history"

export default function CodeConverter({
  code,
  currentLanguage,
  onConvert,
  className,
  threadId,
  messageId,
}: CodeConverterProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [convertingTo, setConvertingTo] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [previousConversions, setPreviousConversions] = useState<CodeConversion[]>([])
  const [isLoadingConversions, setIsLoadingConversions] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("new")
  const [hasHistory, setHasHistory] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'above' | 'below'>('above')
  const [hasGoogleAccess, setHasGoogleAccess] = useState(false)
  const [isCheckingGoogleAccess, setIsCheckingGoogleAccess] = useState(true)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Get the API key store and Google API key
  const { getKey, hasDefaultKeys } = useAPIKeyStore()
  const googleApiKey = getKey("google")

  const detectedLanguage = detectLanguageFromCode(code)
  const detectedFramework = detectFrameworkFromCode(code)
  const language = currentLanguage || detectedLanguage

  // Filter out the current language/framework from conversion options
  const availableTargets = CONVERSION_TARGETS.filter((target) => {
    if (language && target.language === language) {
      return target.framework && target.framework !== detectedFramework
    }
    return true
  })

  // Filter targets based on search term
  const filteredTargets = availableTargets.filter((target) =>
    target.label.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Group targets by category
  const languageTargets = filteredTargets.filter((t) => !t.framework)
  const frameworkTargets = filteredTargets.filter((t) => t.framework)

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!isOpen) {
      // Check if there's enough space above for the dropdown
      if (buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const dropdownHeight = 400 // max height of dropdown
        const spaceAbove = buttonRect.top
        const spaceBelow = window.innerHeight - buttonRect.bottom
        
        // Position below if there's not enough space above or if this is near the top of the viewport
        if (spaceAbove < dropdownHeight + 20 || buttonRect.top < 100) {
          setDropdownPosition('below')
        } else {
          setDropdownPosition('above')
        }
      }
    }
    
    setIsOpen(!isOpen)
    setSearchTerm("")

    // Fetch conversions when dropdown opens
    if (!isOpen && threadId && messageId) {
      fetchPreviousConversions()
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && activeTab === "new") {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, activeTab])

  // Check for Google API access (user key or server fallback)
  useEffect(() => {
    const checkGoogleAccess = async () => {
      setIsCheckingGoogleAccess(true)
      try {
        // If user has their own Google API key, use it
        if (googleApiKey) {
          console.log("✅ Using user-provided Google API key")
          setHasGoogleAccess(true)
          return
        }

        // Otherwise, check if server has fallback Google API key
        const hasServerKey = await hasDefaultKeys("google")
        console.log("🔍 Server Google API key available:", hasServerKey)
        setHasGoogleAccess(hasServerKey)
      } catch (error) {
        console.error("❌ Error checking Google API access:", error)
        setHasGoogleAccess(false)
      } finally {
        setIsCheckingGoogleAccess(false)
      }
    }

    checkGoogleAccess()
  }, [googleApiKey, hasDefaultKeys])

  // Fetch previous conversions when the component mounts or when code/language changes
  useEffect(() => {
    if (threadId && messageId) {
      fetchPreviousConversions()
    }
  }, [threadId, messageId])

  // Function to fetch previous conversions
  const fetchPreviousConversions = async () => {
    if (!threadId || !messageId) return

    setIsLoadingConversions(true)

    try {
      // Get authentication headers
      const headers = await getAuthHeaders()
      console.log("🔑 Auth headers for fetching conversions:", Object.keys(headers))

      const response = await fetch(`/api/code-conversions?threadId=${threadId}&messageId=${messageId}`, {
        method: "GET",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error response:", errorText)
        throw new Error("Failed to fetch previous conversions")
      }

      const data = await response.json()
      console.log(`✅ Fetched ${data.length} conversions from API`)

      // Filter conversions for this specific code
      const normalizedCode = code.replace(/\s+/g, " ").trim()
      const matchingConversions = data.filter((conv: CodeConversion) => {
        // If we don't have code yet, show all conversions for this message
        if (!code) return true

        const normalizedOriginal = conv.original_code.replace(/\s+/g, " ").trim()

        // More lenient matching - check if the code is similar enough
        const isCodeMatch =
          normalizedOriginal === normalizedCode ||
          normalizedOriginal.replace(/\s+/g, "") === normalizedCode.replace(/\s+/g, "") ||
          (normalizedOriginal.length > 20 && normalizedCode.includes(normalizedOriginal.substring(0, 20)))

        const isLanguageMatch = !language || conv.original_language === language

        return isCodeMatch && isLanguageMatch
      })

      console.log(`✅ Found ${matchingConversions.length} matching conversions`)
      setPreviousConversions(matchingConversions)
      setHasHistory(matchingConversions.length > 0)

      // If we have history and no active tab is set, default to history tab
      if (matchingConversions.length > 0 && !activeTab) {
        setActiveTab("history")
      }

      // If this is the initial load and we have conversions, apply the most recent one
      if (matchingConversions.length > 0 && !isOpen) {
        const mostRecent = matchingConversions[0]
        onConvert(mostRecent.converted_code, mostRecent.target_language)
      }
    } catch (error) {
      console.error("Error fetching previous conversions:", error)
    } finally {
      setIsLoadingConversions(false)
    }
  }

  const handleConvert = async (target: ConversionTarget) => {
    setIsOpen(false)
    setSearchTerm("")

    if (!hasGoogleAccess) {
      toast.error("Google API access required for code conversion. Please add a Google API key in Settings or ensure server has one configured.")
      return
    }

    setIsConverting(true)
    setConvertingTo(target.label)

    try {
      // Get authentication headers
      const headers = await getAuthHeaders()
      console.log("🔑 Auth headers for conversion:", Object.keys(headers))

      const allHeaders: Record<string, string> = {
        ...headers,
        "Content-Type": "application/json",
      }

      // Only add Google API key header if user has one
      if (googleApiKey) {
        allHeaders["X-Google-API-Key"] = googleApiKey
      }

      console.log("📤 Sending conversion request with headers:", Object.keys(allHeaders))

      const requestBody = {
        code,
        fromLanguage: language,
        fromFramework: detectedFramework,
        target,
        threadId,
        messageId,
      }

      const response = await fetch("/api/convert-code", {
        method: "POST",
        headers: allHeaders,
        body: JSON.stringify(requestBody),
      })

      console.log("📥 Conversion response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error response:", errorText)

        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText }
        }

        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("✅ Conversion successful:", result)

      // Add the new conversion to the previous conversions list
      if (threadId && messageId) {
        const newConversion: CodeConversion = {
          id: result.id || Date.now().toString(),
          thread_id: threadId,
          message_id: messageId,
          user_id: "current-user", // This will be replaced by the server
          original_code: code,
          original_language: language || "unknown",
          converted_code: result.convertedCode,
          target_language: result.target,
          created_at: new Date().toISOString(),
        }

        setPreviousConversions((prev) => [newConversion, ...prev])
        setHasHistory(true)
      }

      // Call the onConvert callback to update the parent component
      onConvert(result.convertedCode, result.target)
      toast.success(`Code converted to ${result.target}`)

      // Refresh the conversions list after a successful conversion
      setTimeout(() => {
        fetchPreviousConversions()
      }, 1000)
    } catch (error) {
      console.error("❌ Code conversion error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to convert code")
    } finally {
      setIsConverting(false)
      setConvertingTo(null)
    }
  }

  const handlePreviousConversion = (conversion: CodeConversion) => {
    setIsOpen(false)
    setSearchTerm("")

    // Call the onConvert callback to update the parent component with the selected conversion
    onConvert(conversion.converted_code, conversion.target_language)
  }

  // Handle tab switching
  const handleTabChange = (tab: TabType) => {
    console.log("Switching to tab:", tab)
    setActiveTab(tab)
  }

  // Debug logging for convert button visibility
  if (availableTargets.length > 0) {
    console.log("🔍 CodeConverter render check:", {
      hasGoogleApiKey: !!googleApiKey,
      hasGoogleAccess,
      isCheckingGoogleAccess,
      availableTargetsCount: availableTargets.length,
      language,
      willRender: hasGoogleAccess && availableTargets.length > 0 && !isCheckingGoogleAccess
    })
  }

  // Don't render while checking Google access
  if (isCheckingGoogleAccess) {
    return null
  }

  // Only show if we have Google API access and available targets
  if (!hasGoogleAccess || availableTargets.length === 0) {
    console.log("❌ CodeConverter not rendering:", {
      reason: !hasGoogleAccess ? "No Google API access" : "No available targets",
      hasGoogleAccess,
      availableTargetsCount: availableTargets.length
    })
    return null
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2 text-xs",
          "hover:bg-muted/80 border border-transparent hover:border-border",
          "bg-background/80 backdrop-blur-sm",
          className,
          hasHistory && "pr-1", // Reduce right padding when we have history
        )}
        disabled={isConverting}
        onClick={toggleDropdown}
      >
        {isConverting ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            <span className="truncate max-w-16">{convertingTo}</span>
          </>
        ) : (
          <>
            <Code2 className="w-3 h-3 mr-1" />
            Convert
            {hasHistory && (
              <span className="ml-1 bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                {previousConversions.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </>
        )}
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute right-0 w-80 bg-background border border-border rounded-md shadow-lg z-[9999] overflow-hidden",
            dropdownPosition === 'above' 
              ? "top-0 transform -translate-y-full -mt-1" 
              : "top-full mt-1"
          )}
          style={{ maxHeight: "400px" }}
        >
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              type="button"
              className={cn(
                "flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1",
                activeTab === "new"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
              onClick={() => handleTabChange("new")}
            >
              <Code2 className="w-3 h-3" />
              New Conversion
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1",
                activeTab === "history"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                previousConversions.length === 0 ? "opacity-50 cursor-not-allowed" : "",
              )}
              onClick={() => handleTabChange("history")}
              disabled={previousConversions.length === 0}
            >
              <History className="w-3 h-3" />
              History {previousConversions.length > 0 && `(${previousConversions.length})`}
            </button>
          </div>

          {/* New Conversion Tab */}
          {activeTab === "new" && (
            <>
              {/* Search Input */}
              <div className="p-3 border-b border-border bg-muted/30">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search languages & frameworks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
                {filteredTargets.length === 0 && searchTerm ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No matches found for "{searchTerm}"
                  </div>
                ) : (
                  <>
                    {/* Languages Section */}
                    {languageTargets.length > 0 && (
                      <div className="p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background">
                          Languages ({languageTargets.length})
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {languageTargets.map((target) => (
                            <button
                              key={`${target.language}-${target.framework || "none"}`}
                              onClick={() => handleConvert(target)}
                              className="text-xs px-2 py-1.5 rounded-sm hover:bg-muted text-left transition-colors truncate"
                              title={target.label}
                            >
                              {target.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Separator */}
                    {languageTargets.length > 0 && frameworkTargets.length > 0 && (
                      <div className="border-t border-border" />
                    )}

                    {/* Frameworks Section */}
                    {frameworkTargets.length > 0 && (
                      <div className="p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background">
                          Frameworks ({frameworkTargets.length})
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {frameworkTargets.map((target) => (
                            <button
                              key={`${target.language}-${target.framework || "none"}`}
                              onClick={() => handleConvert(target)}
                              className="text-xs px-2 py-1.5 rounded-sm hover:bg-muted text-left transition-colors truncate"
                              title={target.label}
                            >
                              {target.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="overflow-y-auto" style={{ maxHeight: "320px" }}>
              {/* Previous Conversions Header */}
              <div className="p-3 sticky top-0 bg-background border-b border-border flex items-center justify-between">
                <div className="text-xs font-medium">Previous Conversions ({previousConversions.length})</div>
                <button
                  type="button"
                  onClick={fetchPreviousConversions}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  disabled={isLoadingConversions}
                  title="Refresh conversions"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoadingConversions && "animate-spin")} />
                </button>
              </div>

              {/* Previous Conversions List */}
              {previousConversions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {isLoadingConversions ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <p>Loading conversions...</p>
                    </div>
                  ) : (
                    <p>No previous conversions found</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1 p-2">
                  {previousConversions.map((conversion) => (
                    <button
                      key={conversion.id}
                      onClick={() => handlePreviousConversion(conversion)}
                      className="text-xs p-2 rounded hover:bg-muted text-left transition-colors flex items-center gap-2"
                      title={`${conversion.target_language} (${new Date(conversion.created_at).toLocaleString()})`}
                    >
                      <span className="w-3 h-3 rounded-full bg-primary/30 flex-shrink-0" />
                      <div className="flex flex-col flex-grow min-w-0">
                        <span className="font-medium truncate">{conversion.target_language}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(conversion.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer with stats */}
          <div className="border-t border-border p-2 bg-muted/30">
            <div className="text-xs text-muted-foreground text-center">
              {activeTab === "new" && (
                <>
                  {filteredTargets.length} of {availableTargets.length} options
                  {searchTerm && ` matching "${searchTerm}"`}
                </>
              )}
              {activeTab === "history" && (
                <>
                  {previousConversions.length} previous conversion{previousConversions.length !== 1 && "s"}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
