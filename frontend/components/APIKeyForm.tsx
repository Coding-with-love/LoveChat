"use client"

import { useState, useEffect } from "react"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { toast } from "sonner"
import { Eye, EyeOff, Check, X, RefreshCw } from "lucide-react"
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
  const [showForceLoad, setShowForceLoad] = useState(false)

  // Initialize keys from store
  useEffect(() => {
    const initializeKeys = async () => {
      try {
        setIsLoading(true)
        
        // Get keys from current store state first
        const currentOpenaiKey = getKey("openai") || ""
        const currentGoogleKey = getKey("google") || ""
        const currentOpenrouterKey = getKey("openrouter") || ""

        setOpenaiKey(currentOpenaiKey)
        setGoogleKey(currentGoogleKey)
        setOpenrouterKey(currentOpenrouterKey)

        // If we don't have keys in store, try to load from database
        if (!currentOpenaiKey && !currentGoogleKey && !currentOpenrouterKey) {
          console.log("🔄 No keys in store, loading from database...")
          try {
            await loadKeys()
            
            // Update local state with loaded keys
            setOpenaiKey(getKey("openai") || "")
            setGoogleKey(getKey("google") || "")
            setOpenrouterKey(getKey("openrouter") || "")
          } catch (error) {
            console.error("❌ Error loading API keys:", error)
            // Continue with empty keys if loading fails
          }
        }
      } catch (error) {
        console.error("❌ Error initializing API keys:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeKeys()
  }, [getKey, getAllKeys, loadKeys])

  // Enhanced loading timeout with force load option
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (isLoading || storeLoading) {
        console.warn("⚠️ APIKeyForm loading timeout - showing force load option")
        setShowForceLoad(true)
      }
    }, 3000) // Reduced to 3 seconds
    
    const forceTimeout = setTimeout(() => {
      if (isLoading || storeLoading) {
        console.warn("⚠️ APIKeyForm force loading timeout - forcing display")
        setIsLoading(false)
        setShowForceLoad(false)
        
        // Load keys from current store state
        setOpenaiKey(getKey("openai") || "")
        setGoogleKey(getKey("google") || "")
        setOpenrouterKey(getKey("openrouter") || "")
      }
    }, 7000) // Force display after 7 seconds
    
    return () => {
      clearTimeout(loadingTimeout)
      clearTimeout(forceTimeout)
    }
  }, [isLoading, storeLoading, getKey])

  // Force load function
  const handleForceLoad = () => {
    console.log("🔧 Force loading API keys")
    setIsLoading(false)
    setShowForceLoad(false)
    
    // Load keys from current store state
    setOpenaiKey(getKey("openai") || "")
    setGoogleKey(getKey("google") || "")
    setOpenrouterKey(getKey("openrouter") || "")
    
    toast.success("API keys form loaded")
  }

  const handleSaveKeys = async () => {
    try {
      setIsSaving(true)

      const updates = []
      if (openaiKey.trim()) updates.push(setKey("openai", openaiKey.trim()))
      if (googleKey.trim()) updates.push(setKey("google", googleKey.trim()))
      if (openrouterKey.trim()) updates.push(setKey("openrouter", openrouterKey.trim()))

      await Promise.all(updates)
      toast.success("API keys saved successfully")
    } catch (error) {
      console.error("Error saving API keys:", error)
      toast.error("Failed to save API keys")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearKey = async (provider: string) => {
    try {
      await removeKey(provider)

      // Update local state
      switch (provider) {
        case "openai":
          setOpenaiKey("")
          break
        case "google":
          setGoogleKey("")
          break
        case "openrouter":
          setOpenrouterKey("")
          break
      }

      toast.success(`${provider} API key removed`)
    } catch (error) {
      console.error(`Error removing ${provider} API key:`, error)
      toast.error(`Failed to remove ${provider} API key`)
    }
  }

  // Show loading state only if we're actually loading and for less than 5 seconds
  if (isLoading && !storeError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-foreground border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading API keys...</p>
        {showForceLoad && (
          <Button onClick={handleForceLoad} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Force Load
          </Button>
        )}
      </div>
    )
  }

  // Show error state if there's an error
  if (storeError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-sm text-destructive">Error loading API keys: {storeError}</p>
        <Button 
          onClick={() => {
            setIsLoading(true)
            loadKeys().finally(() => setIsLoading(false))
          }} 
          variant="outline" 
          size="sm"
        >
          Retry
        </Button>
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
          <span className="text-xs text-muted-foreground">Required for Claude and other models</span>
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

      <Button onClick={handleSaveKeys} className="w-full" disabled={isSaving}>
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

      {showForceLoad && (
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
          <div className="mt-4 space-x-2">
            <Button onClick={handleForceLoad} variant="outline">
              Force Load API Keys
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
