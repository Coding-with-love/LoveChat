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
  const lastVisibilityTime = useRef(Date.now())

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
      lastVisibilityTime.current = Date.now()
      return
    }
  }, [user])

  useEffect(() => {
    // Much more conservative visibility change handler
    const handleVisibilityChange = () => {
      const now = Date.now()
      const wasHiddenFor = now - lastVisibilityTime.current
      
      if (document.visibilityState === "visible") {
        console.log("🔄 Tab became visible after", Math.round(wasHiddenFor/1000), "seconds")
        
        // Only attempt to reload if:
        // 1. User is authenticated
        // 2. Not currently loading
        // 3. Haven't exceeded retry attempts
        // 4. Hidden for more than 60 seconds (increased from immediate)
        // 5. Actually missing keys
        if (user && !isLoading && loadAttempts.current < 3 && wasHiddenFor > 60000) {
          const keys = getAllKeys()
          const hasKeys = Object.keys(keys).length > 0
          
          console.log("🔄 Checking API keys after long absence:", {
            hasKeys,
            wasHiddenFor: Math.round(wasHiddenFor/1000) + "s",
            loadAttempts: loadAttempts.current
          })
          
          // Only reload if no keys are actually missing
          if (!hasKeys) {
            console.log("🔄 No keys found after long absence, attempting to load...")
            loadAttempts.current += 1
            loadKeys().catch(error => {
              console.warn("⚠️ Failed to load API keys on visibility change:", error)
            })
          } else {
            console.log("🔄 Keys available, no reload needed")
          }
        } else if (wasHiddenFor <= 60000) {
          console.log(`🔄 Tab returned quickly (${Math.round(wasHiddenFor/1000)}s), skipping key check`)
        }
        
        lastVisibilityTime.current = now
      } else {
        console.log("🔄 Tab became hidden")
        lastVisibilityTime.current = now
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user, loadKeys, getAllKeys, isLoading])
} 