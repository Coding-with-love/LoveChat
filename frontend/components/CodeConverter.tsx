"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Code2, Loader2, ChevronDown, Search } from 'lucide-react'
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

interface CodeConverterProps {
  code: string
  currentLanguage?: string
  onConvert: (convertedCode: string, target: string) => void
  className?: string
}

export default function CodeConverter({ code, currentLanguage, onConvert, className }: CodeConverterProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [convertingTo, setConvertingTo] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Get the API key store and Google API key
  const { getKey } = useAPIKeyStore()
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
    console.log("Toggle dropdown, current state:", isOpen)
    setIsOpen(!isOpen)
    setSearchTerm("")
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
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Debug logging for dropdown state
  useEffect(() => {
    console.log("Dropdown state changed:", { isOpen, targets: availableTargets.length })
  }, [isOpen, availableTargets.length])

  const handleConvert = async (target: ConversionTarget) => {
    setIsOpen(false)
    setSearchTerm("")

    if (!googleApiKey) {
      toast.error("Google API key required for code conversion. Please add it in Settings.")
      return
    }

    setIsConverting(true)
    setConvertingTo(target.label)

    try {
      const headers = await getAuthHeaders()

      const allHeaders = {
        "Content-Type": "application/json",
        ...headers,
        "X-Google-API-Key": googleApiKey,
      }

      const requestBody = {
        code,
        fromLanguage: language,
        fromFramework: detectedFramework,
        target,
      }

      const response = await fetch("/api/convert-code", {
        method: "POST",
        headers: allHeaders,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText }
        }

        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      onConvert(result.convertedCode, result.target)
      toast.success(`Code converted to ${result.target}`)
    } catch (error) {
      console.error("❌ Code conversion error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to convert code")
    } finally {
      setIsConverting(false)
      setConvertingTo(null)
    }
  }

  // Only show if we have a Google API key and available targets
  if (!googleApiKey || availableTargets.length === 0) {
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
            <ChevronDown className="w-3 h-3 ml-1" />
          </>
        )}
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-0 transform -translate-y-full -mt-1 w-80 bg-background border border-border rounded-md shadow-lg z-[9999] overflow-hidden"
          style={{ maxHeight: "400px" }}
        >
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
            {filteredTargets.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No matches found for "{searchTerm}"</div>
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

          {/* Footer with stats */}
          <div className="border-t border-border p-2 bg-muted/30">
            <div className="text-xs text-muted-foreground text-center">
              {filteredTargets.length} of {availableTargets.length} options
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
