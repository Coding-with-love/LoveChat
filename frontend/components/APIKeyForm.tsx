"use client"

import { useState, useEffect } from "react"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { toast } from "sonner"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function APIKeyForm() {
  const { getKey, setKey, removeKey, getAllKeys, loadKeys, isLoading: storeLoading, error: storeError } = useAPIKeyStore()

  const [openaiKey, setOpenaiKey] = useState("")
  const [googleKey, setGoogleKey] = useState("")
  const [openrouterKey, setOpenrouterKey] = useState("")
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showGoogleKey, setShowGoogleKey] = useState(false)
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load keys on mount and set up tab visibility refresh
  useEffect(() => {
    const initializeKeys = async () => {
      try {
        console.log("🔄 APIKeyForm initializing...")
        setIsLoading(true)
        
        // Try to load from store first (in case already loaded)
        let openaiKeyValue = getKey("openai") || ""
        let googleKeyValue = getKey("google") || ""
        let openrouterKeyValue = getKey("openrouter") || ""
        
        // If no keys found, try loading from database
        if (!openaiKeyValue && !googleKeyValue && !openrouterKeyValue) {
          console.log("🔄 No keys in store, loading from database...")
          
          // Add timeout to prevent infinite loading
          const loadPromise = loadKeys()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Load keys timeout")), 10000)
          )
          
          try {
            await Promise.race([loadPromise, timeoutPromise])
            
            // Get keys again after loading
            openaiKeyValue = getKey("openai") || ""
            googleKeyValue = getKey("google") || ""
            openrouterKeyValue = getKey("openrouter") || ""
          } catch (loadError) {
            console.warn("⚠️ Database load failed, using store state:", loadError)
          }
        }

        console.log("✅ Keys loaded:", {
          openai: !!openaiKeyValue,
          google: !!googleKeyValue,
          openrouter: !!openrouterKeyValue,
        })

        setOpenaiKey(openaiKeyValue)
        setGoogleKey(googleKeyValue)
        setOpenrouterKey(openrouterKeyValue)
      } catch (error) {
        console.error("❌ Error loading API keys:", error)
        toast.error("Failed to load API keys")
        
        // Even on error, try to get keys from current store state
        const openaiKeyValue = getKey("openai") || ""
        const googleKeyValue = getKey("google") || ""
        const openrouterKeyValue = getKey("openrouter") || ""
        
        setOpenaiKey(openaiKeyValue)
        setGoogleKey(googleKeyValue)
        setOpenrouterKey(openrouterKeyValue)
      } finally {
        setIsLoading(false)
        console.log("🔄 APIKeyForm initialization complete")
      }
    }

    initializeKeys()
  }, [getKey, loadKeys])

  // Handle tab visibility changes - refresh keys when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("🔄 Settings tab became visible, refreshing API keys")
        
        // Refresh keys from current store state (don't reload from DB)
        const openaiKeyValue = getKey("openai") || ""
        const googleKeyValue = getKey("google") || ""
        const openrouterKeyValue = getKey("openrouter") || ""
        
        setOpenaiKey(openaiKeyValue)
        setGoogleKey(googleKeyValue)
        setOpenrouterKey(openrouterKeyValue)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [getKey])

  // Show error toast when store error occurs
  useEffect(() => {
    if (storeError) {
      toast.error(storeError)
    }
  }, [storeError])

  const handleSaveKeys = async () => {
    setIsSaving(true)

    try {
      console.log("💾 Saving API keys...")

      // Only save non-empty keys
      if (openaiKey.trim()) {
        await setKey("openai", openaiKey.trim())
        console.log("✅ OpenAI key saved")
      }

      if (googleKey.trim()) {
        await setKey("google", googleKey.trim())
        console.log("✅ Google key saved")
      }

      if (openrouterKey.trim()) {
        await setKey("openrouter", openrouterKey.trim())
        console.log("✅ OpenRouter key saved")
      }

      // Log all available keys after saving
      console.log("📋 All keys after saving:", getAllKeys())

      toast.success("API keys saved successfully")
    } catch (error) {
      console.error("❌ Error saving API keys:", error)
      toast.error("Failed to save API keys")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearKey = async (provider: string) => {
    try {
      if (provider === "openai") {
        setOpenaiKey("")
        await removeKey("openai")
      } else if (provider === "google") {
        setGoogleKey("")
        await removeKey("google")
      } else if (provider === "openrouter") {
        setOpenrouterKey("")
        await removeKey("openrouter")
      }

      console.log(`🗑️ ${provider} key removed`)
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key removed`)
    } catch (error) {
      console.error(`❌ Error removing ${provider} key:`, error)
      toast.error(`Failed to remove ${provider} API key`)
    }
  }

  // Fallback mechanism: if loading for more than 15 seconds, show the form anyway
  useEffect(() => {
    if (isLoading || storeLoading) {
      const fallbackTimer = setTimeout(() => {
        if (isLoading || storeLoading) {
          console.warn("⚠️ APIKeyForm loading timeout - forcing display")
          setIsLoading(false)
          
          // Load keys from current store state
          const openaiKeyValue = getKey("openai") || ""
          const googleKeyValue = getKey("google") || ""
          const openrouterKeyValue = getKey("openrouter") || ""
          
          setOpenaiKey(openaiKeyValue)
          setGoogleKey(googleKeyValue)
          setOpenrouterKey(openrouterKeyValue)
        }
      }, 15000)
      
      return () => clearTimeout(fallbackTimer)
    }
  }, [isLoading, storeLoading, getKey])

  const [showForceLoad, setShowForceLoad] = useState(false)

  // Show force load button after 5 seconds
  useEffect(() => {
    if (isLoading || storeLoading) {
      const timer = setTimeout(() => {
        setShowForceLoad(true)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowForceLoad(false)
    }
  }, [isLoading, storeLoading])

  const handleForceLoad = () => {
    console.log("🔧 Force loading API keys form")
    setIsLoading(false)
    
    // Load keys from current store state
    const openaiKeyValue = getKey("openai") || ""
    const googleKeyValue = getKey("google") || ""
    const openrouterKeyValue = getKey("openrouter") || ""
    
    setOpenaiKey(openaiKeyValue)
    setGoogleKey(googleKeyValue)
    setOpenrouterKey(openrouterKeyValue)
    
    setShowForceLoad(false)
  }

  if (isLoading || storeLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-foreground border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading API keys...</p>
        {showForceLoad && (
          <Button onClick={handleForceLoad} variant="outline" size="sm">
            Force Load
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* OpenAI API Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="openai-key" className="text-sm font-medium">
            OpenAI API Key
          </Label>
          <span className="text-xs text-muted-foreground">Required for GPT-4o, GPT-4-turbo models</span>
        </div>
        <div className="relative">
          <Input
            id="openai-key"
            type={showOpenaiKey ? "text" : "password"}
            placeholder="sk-..."
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            className="pr-20"
          />
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {openaiKey && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleClearKey("openai")}
                aria-label="Clear OpenAI API key"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              aria-label={showOpenaiKey ? "Hide OpenAI API key" : "Show OpenAI API key"}
            >
              {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn("flex h-2 w-2 rounded-full", openaiKey ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600")}
          />
          <span className="text-muted-foreground">{openaiKey ? "API key set" : "No API key set"}</span>
        </div>
      </div>

      {/* Google API Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="google-key" className="text-sm font-medium">
            Google API Key
          </Label>
          <span className="text-xs text-muted-foreground">Required for Gemini models</span>
        </div>
        <div className="relative">
          <Input
            id="google-key"
            type={showGoogleKey ? "text" : "password"}
            placeholder="AIza..."
            value={googleKey}
            onChange={(e) => setGoogleKey(e.target.value)}
            className="pr-20"
          />
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {googleKey && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleClearKey("google")}
                aria-label="Clear Google API key"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowGoogleKey(!showGoogleKey)}
              aria-label={showGoogleKey ? "Hide Google API key" : "Show Google API key"}
            >
              {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn("flex h-2 w-2 rounded-full", googleKey ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600")}
          />
          <span className="text-muted-foreground">{googleKey ? "API key set" : "No API key set"}</span>
        </div>
      </div>

      {/* OpenRouter API Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="openrouter-key" className="text-sm font-medium">
            OpenRouter API Key
          </Label>
          <span className="text-xs text-muted-foreground">Required for Claude and Llama models</span>
        </div>
        <div className="relative">
          <Input
            id="openrouter-key"
            type={showOpenrouterKey ? "text" : "password"}
            placeholder="sk-or-..."
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
            className="pr-20"
          />
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {openrouterKey && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleClearKey("openrouter")}
                aria-label="Clear OpenRouter API key"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
              aria-label={showOpenrouterKey ? "Hide OpenRouter API key" : "Show OpenRouter API key"}
            >
              {showOpenrouterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn("flex h-2 w-2 rounded-full", openrouterKey ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600")}
          />
          <span className="text-muted-foreground">{openrouterKey ? "API key set" : "No API key set"}</span>
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSaveKeys} className="w-full" disabled={isSaving || storeLoading}>
        {isSaving ? (
          <>
            <span className="animate-spin mr-2">⟳</span>
            Saving...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Save API Keys
          </>
        )}
      </Button>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="text-sm font-medium mb-2">API Key Status</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span>OpenAI:</span>
            <span className={cn("font-medium", openaiKey ? "text-green-500" : "text-red-500")}>
              {openaiKey ? "Configured" : "Not Configured"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Google:</span>
            <span className={cn("font-medium", googleKey ? "text-green-500" : "text-red-500")}>
              {googleKey ? "Configured" : "Not Configured"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>OpenRouter:</span>
            <span className={cn("font-medium", openrouterKey ? "text-green-500" : "text-red-500")}>
              {openrouterKey ? "Configured" : "Not Configured"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
