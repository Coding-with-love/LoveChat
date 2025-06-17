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
  const {
    getKey,
    setKey,
    removeKey,
    getAllKeys,
    loadKeys,
    isLoading: storeLoading,
    error: storeError,
  } = useAPIKeyStore()

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
      openrouter: !!currentOpenrouterKey,
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

        // If we don't have keys in store and we haven't loaded from DB yet, try to load from database
        if (!currentOpenaiKey && !currentGoogleKey && !currentOpenrouterKey && !storeLoading) {
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
  }, [getKey, getAllKeys, loadKeys, storeLoading])

  // Enhanced loading timeout with force load option
  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout
    let forceTimeout: NodeJS.Timeout

    // Only start timeouts if we're actually loading
    if (isLoading || storeLoading) {
      loadingTimeout = setTimeout(() => {
        if (isLoading || storeLoading) {
          console.warn("⚠️ APIKeyForm loading timeout - showing force load option")
          setShowForceLoad(true)
        }
      }, 3000) // Show force load after 3 seconds

      forceTimeout = setTimeout(() => {
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
    }

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

  // Show loading state only if we're actually loading and haven't shown force load yet
  if ((isLoading || storeLoading) && !showForceLoad && !storeError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-foreground border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading API keys...</p>
      </div>
    )
  }

  // Show force load option if loading takes too long
  if ((isLoading || storeLoading) && showForceLoad && !storeError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-sm text-muted-foreground">Loading is taking longer than expected...</p>
        <Button onClick={handleForceLoad} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Force Load Form
        </Button>
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
      {/* Refined Information Box with Icons and Bullet Points */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
            <Check className="h-4 w-4 text-white" />
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">API Key Requirements</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <span className="text-red-500">🔴</span>
                <span>
                  <strong>Required:</strong> OpenAI & OpenRouter for GPT / Claude
                </span>
              </div>
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <span className="text-green-500">🟢</span>
                <span>
                  <strong>Optional:</strong> Google Gemini (fallback supported)
                </span>
              </div>
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <span className="text-gray-400">⚪</span>
                <span>
                  <strong>Not Needed:</strong> Ollama (runs locally)
                </span>
              </div>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
              <span>💡</span>
              <span>Add your keys to unlock full features & avoid limits.</span>
            </p>
          </div>
        </div>
      </div>

      {/* OpenAI API Key Section Card */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 font-bold text-sm">AI</span>
            </div>
            <Label htmlFor="openai-key" className="text-sm font-medium">
              OpenAI API Key
            </Label>
          </div>
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Required</span>
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
                className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => handleClearKey("openai")}
                title="Clear OpenAI API key"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              title={showOpenaiKey ? "Hide OpenAI API key" : "Show OpenAI API key"}
            >
              {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-2 w-2 rounded-full", openaiKey ? "bg-green-500" : "bg-red-500")} />
            <span className="text-muted-foreground">{openaiKey ? "Using your API key" : "API key required"}</span>
          </div>
        </div>
      </div>

      {/* Google API Key Section Card */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">G</span>
            </div>
            <Label htmlFor="google-key" className="text-sm font-medium">
              Google API Key
            </Label>
          </div>
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Optional</span>
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
                className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => handleClearKey("google")}
                title="Clear Google API key"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => setShowGoogleKey(!showGoogleKey)}
              title={showGoogleKey ? "Hide Google API key" : "Show Google API key"}
            >
              {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-2 w-2 rounded-full", googleKey ? "bg-green-500" : "bg-green-400")} />
            <span className="text-muted-foreground">{googleKey ? "Using your API key" : "Using default API key"}</span>
          </div>
        </div>
      </div>

      {/* OpenRouter API Key Section Card */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">OR</span>
            </div>
            <Label htmlFor="openrouter-key" className="text-sm font-medium">
              OpenRouter API Key
            </Label>
          </div>
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Required</span>
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
                className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => handleClearKey("openrouter")}
                title="Clear OpenRouter API key"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
              title={showOpenrouterKey ? "Hide OpenRouter API key" : "Show OpenRouter API key"}
            >
              {showOpenrouterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-2 w-2 rounded-full", openrouterKey ? "bg-green-500" : "bg-red-500")} />
            <span className="text-muted-foreground">{openrouterKey ? "Using your API key" : "API key required"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          onClick={handleSaveKeys}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              Saving Keys...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Override with Your Keys
            </>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground">You can revert to default server keys at any time.</p>
      </div>
    </div>
  )
}
