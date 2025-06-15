import { useEffect, useRef } from "react"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useAuth } from "@/frontend/components/AuthProvider"

/**
 * Hook to ensure model preferences are properly hydrated from database
 */
export function useModelHydration() {
  const { user } = useAuth()
  const { loadFromDatabase, hasLoadedFromDB } = useModelStore()
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Only run once when user is available and we haven't loaded from DB yet
    if (!user || hasLoadedFromDB || hasInitialized.current) {
      return
    }

    console.log("🔄 Initial Model Preferences Hydration - Loading from database...")
    hasInitialized.current = true
    
    loadFromDatabase().catch(error => {
      console.warn("⚠️ Failed to load model preferences:", error)
      hasInitialized.current = false // Allow retry on error
    })
  }, [user, hasLoadedFromDB, loadFromDatabase])

  return {
    hasLoadedFromDB,
    isReady: hasLoadedFromDB
  }
} 