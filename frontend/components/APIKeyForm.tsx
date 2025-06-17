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

  // Sync form state with store state whenever store updates
  useEffect(() => {
    const currentOpenaiKey = getKey("openai") || ""
    const currentGoogleKey = getKey("google") || ""
    const currentOpenrouterKey = getKey("openrouter") || ""
    
    setOpenaiKey(currentOpenaiKey)
    setGoogleKey(currentGoogleKey)
    setOpenrouterKey(currentOpenrouterKey)
    
    console.log("🔄 Syncing form with store state:", {
      openai: !!currentOpenaiKey,
      google: !!currentGoogleKey,
      openrouter: !!currentOpenrouterKey
    })
  }, [getKey])

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
            
            // Update local state with loaded keys after database load
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
      console.log("💾 Saving API keys...")

      const updates = []
      if (openaiKey.trim()) {
        console.log("💾 Saving OpenAI key...")
        updates.push(setKey("openai", openaiKey.trim()))
      }
      if (googleKey.trim()) {
        console.log("💾 Saving Google key...")
        updates.push(setKey("google", googleKey.trim()))
      }
      if (openrouterKey.trim()) {
        console.log("💾 Saving OpenRouter key...")
        updates.push(setKey("openrouter", openrouterKey.trim()))
      }

      if (updates.length === 0) {
        toast.error("No API keys to save")
        return
      }

      await Promise.all(updates)
      
      // After successful save, sync form state with store state
      setTimeout(() => {
        setOpenaiKey(getKey("openai") || "")
        setGoogleKey(getKey("google") || "")
        setOpenrouterKey(getKey("openrouter") || "")
        console.log("✅ Form state synced after save")
      }, 100) // Small delay to ensure store is updated
      
      toast.success("API keys saved successfully")
    } catch (error) {
      console.error("❌ Error saving API keys:", error)
      toast.error("Failed to save API keys")
      
      // On error, revert form to store state
      setOpenaiKey(getKey("openai") || "")
      setGoogleKey(getKey("google") || "")
      setOpenrouterKey(getKey("openrouter") || "")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearKey = async (provider: string) => {
    try {
      await removeKey(provider)

      // Update local state immediately
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
      
      // On error, revert to store state
      setOpenaiKey(getKey("openai") || "")
      setGoogleKey(getKey("google") || "")
      setOpenrouterKey(getKey("openrouter") || "")
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
      {/* Information about API key requirements */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
            <Check className="h-3 w-3 text-white" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
              API Key Requirements
            </h4>
            <div className="text-xs text-amber-700 dark:text-amber-200 space-y-1">
              <p><strong>Required:</strong> OpenAI and OpenRouter models need your own API keys</p>
              <p><strong>Optional:</strong> Google Gemini models can use server fallback keys</p>
              <p><strong>No keys needed:</strong> Ollama models run locally</p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">
              💡 Add your own keys to use your quotas and access all features!
            </p>
          </div>
        </div>
      </div>

      {/* OpenAI API Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="openai-key" className="text-sm font-medium">
            OpenAI API Key
          </Label>
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Required for GPT models</span>
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
            className={cn("flex h-2 w-2 rounded-full", openaiKey ? "bg-green-500" : "bg-red-500")}
          />
          <span className="text-muted-foreground">{openaiKey ? "Using your API key" : "API key required"}</span>
        </div>
      </div>

      {/* Google API Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="google-key" className="text-sm font-medium">
            Google API Key
          </Label>
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Optional - server fallback available</span>
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
            className={cn("flex h-2 w-2 rounded-full", googleKey ? "bg-green-500" : "bg-green-400")}
          />
          <span className="text-muted-foreground">{googleKey ? "Using your API key" : "Using default API key"}</span>
        </div>
      </div>

      {/* OpenRouter API Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="openrouter-key" className="text-sm font-medium">
            OpenRouter API Key
          </Label>
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Required for Claude and other models</span>
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
            className={cn("flex h-2 w-2 rounded-full", openrouterKey ? "bg-green-500" : "bg-red-500")}
          />
          <span className="text-muted-foreground">{openrouterKey ? "Using your API key" : "API key required"}</span>
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
            Override with Your Keys
          </>
        )}
      </Button>
    </div>
  )
}
