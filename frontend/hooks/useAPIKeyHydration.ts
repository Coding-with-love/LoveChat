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

    console.log("🔄 Initial API Key Hydration - Always loading from database...")

    // Always load from database on app start to ensure sync across devices/domains
    hasInitialized.current = true
    loadKeys().catch(error => {
      console.warn("⚠️ Failed to load API keys:", error)
      hasInitialized.current = false // Allow retry on error
    })
  }, [loadKeys, isLoading])

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