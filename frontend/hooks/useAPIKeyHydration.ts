import { useEffect, useRef } from "react"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useAuth } from "@/frontend/components/AuthProvider"

/**
 * Hook to ensure API keys are properly hydrated and available
 * This prevents issues when switching browser tabs where state might be lost
 */
export function useAPIKeyHydration() {
  const { user } = useAuth()
  const { loadKeys, getAllKeys, isLoading } = useAPIKeyStore()
  const hasInitialized = useRef(false)
  const loadAttempts = useRef(0)

  useEffect(() => {
    // Only run once when user is available and we haven't initialized
    if (!user || hasInitialized.current || isLoading || loadAttempts.current >= 3) {
      return
    }

    console.log("🔄 Initial API Key Hydration - Loading from database for user:", user.id)

    // Always load from database on app start to ensure sync across devices/domains
    hasInitialized.current = true
    loadAttempts.current += 1
    loadKeys().catch(error => {
      console.warn("⚠️ Failed to load API keys:", error)
      hasInitialized.current = false // Allow retry on error
    })
  }, [user, loadKeys, isLoading])

  useEffect(() => {
    // Reset initialization flag when user changes
    if (!user) {
      hasInitialized.current = false
      loadAttempts.current = 0
      return
    }
  }, [user])

  useEffect(() => {
    // Lightweight visibility change handler - only check, don't reload
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user && !isLoading && loadAttempts.current < 3) {
        const keys = getAllKeys()
        console.log("🔄 Tab became visible, API keys available:", Object.keys(keys).length > 0)
        
        // If no keys are loaded, try loading them
        if (Object.keys(keys).length === 0 && !isLoading) {
          console.log("🔄 No keys found after visibility change, attempting to load...")
          loadAttempts.current += 1
          loadKeys().catch(error => {
            console.warn("⚠️ Failed to load API keys on visibility change:", error)
          })
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user, loadKeys, getAllKeys, isLoading])
} 