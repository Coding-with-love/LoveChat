import { useEffect, useRef } from "react"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"

/**
 * Hook to ensure API keys are properly hydrated and available
 * This prevents issues when switching browser tabs where state might be lost
 */
export function useAPIKeyHydration() {
  const { loadKeys, getAllKeys, isLoading } = useAPIKeyStore()
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Only run once on initial mount
    if (hasInitialized.current || isLoading) {
      return
    }

    const currentKeys = getAllKeys()
    const hasAnyKeys = Object.keys(currentKeys).length > 0
    
    console.log("🔄 Initial API Key Hydration - Current keys:", Object.keys(currentKeys))

    // Only load if no keys and not already loading
    if (!hasAnyKeys && !isLoading) {
      console.log("🔄 No API keys found, loading from database...")
      hasInitialized.current = true
      loadKeys().catch(error => {
        console.warn("⚠️ Failed to load API keys:", error)
        hasInitialized.current = false // Allow retry on error
      })
    } else {
      hasInitialized.current = true
    }
  }, [loadKeys, getAllKeys, isLoading])

  useEffect(() => {
    // Lightweight visibility change handler - only check, don't reload
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const keys = getAllKeys()
        console.log("🔄 Tab became visible, API keys available:", Object.keys(keys).length > 0)
        
        // Don't automatically reload - let components handle their own loading
        // This prevents conflicts with component-level loading
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [getAllKeys])
} 