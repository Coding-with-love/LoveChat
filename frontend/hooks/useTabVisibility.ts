import { useCallback, useEffect, useRef, useState } from "react"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { usePersonaStore } from "@/frontend/stores/PersonaStore"
import { useAuth } from "@/frontend/components/AuthProvider"

interface TabVisibilityOptions {
  onVisible?: () => void
  onHidden?: () => void
  refreshStoresOnVisible?: boolean
}

// Global state to prevent multiple components from triggering store refresh simultaneously
let isGlobalRefreshInProgress = false
let lastGlobalRefreshTime = 0

export function useTabVisibility(options: TabVisibilityOptions = {}) {
  const { onVisible, onHidden, refreshStoresOnVisible = false } = options
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(!document.hidden)
  const loadKeys = useAPIKeyStore((state) => state.loadKeys)
  const lastVisibilityTime = useRef(Date.now())
  const componentId = useRef(Math.random().toString(36).substr(2, 9))
  
  const handleVisibilityChange = useCallback(async () => {
    const now = Date.now()
    const wasHiddenFor = now - lastVisibilityTime.current
    
    if (document.visibilityState === "visible") {
      console.log(`🔄 [${componentId.current}] Tab became visible after`, wasHiddenFor, "ms")
      setIsVisible(true)
      
      // Much more conservative global refresh coordination
      // Only refresh if hidden for more than 30 seconds (increased from 5 seconds)
      if (refreshStoresOnVisible && wasHiddenFor > 30000 && user && !isGlobalRefreshInProgress) {
        const timeSinceLastGlobalRefresh = now - lastGlobalRefreshTime
        
        // Only allow one global refresh every 60 seconds (increased from 5 seconds)
        if (timeSinceLastGlobalRefresh > 60000) {
          isGlobalRefreshInProgress = true
          lastGlobalRefreshTime = now
          
          console.log(`🔄 [${componentId.current}] Coordinating global store refresh (hidden for ${Math.round(wasHiddenFor/1000)}s)`)
          
          // Add timeout to prevent stuck refresh states
          const refreshTimeout = setTimeout(() => {
            console.warn(`⚠️ [${componentId.current}] Global refresh timeout - forcing completion`)
            isGlobalRefreshInProgress = false
          }, 15000) // 15 second timeout
          
          try {
            // Only refresh API keys if they're not already loaded AND we've been hidden for a significant time
            const apiKeyStore = useAPIKeyStore.getState()
            const hasAnyKeys = Object.keys(apiKeyStore.keys).length > 0
            
            // Only reload if no keys exist OR hidden for more than 2 minutes
            if (!hasAnyKeys || wasHiddenFor > 120000) {
              console.log(`🔄 [${componentId.current}] Refreshing API keys (hasKeys: ${hasAnyKeys}, hiddenFor: ${Math.round(wasHiddenFor/1000)}s)`)
              await loadKeys()
              console.log(`✅ [${componentId.current}] API keys refreshed successfully`)
            } else {
              console.log(`🔄 [${componentId.current}] Skipping API key refresh - keys already loaded and not stale`)
            }
          } catch (error) {
            console.error(`❌ [${componentId.current}] Error refreshing API keys:`, error)
          } finally {
            clearTimeout(refreshTimeout)
            isGlobalRefreshInProgress = false
          }
        } else {
          console.log(`🔄 [${componentId.current}] Skipping refresh - too soon after last global refresh (${Math.round(timeSinceLastGlobalRefresh/1000)}s ago)`)
        }
      } else if (refreshStoresOnVisible && wasHiddenFor <= 30000) {
        console.log(`🔄 [${componentId.current}] Skipping refresh - hidden for only ${Math.round(wasHiddenFor/1000)}s (threshold: 30s)`)
      }
      
      // Always call component-specific onVisible callback
      onVisible?.()
    } else {
      console.log(`🔄 [${componentId.current}] Tab became hidden`)
      setIsVisible(false)
      lastVisibilityTime.current = now
      onHidden?.()
    }
  }, [onVisible, onHidden, refreshStoresOnVisible, user, loadKeys])

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    // Also listen for focus/blur events for additional reliability
    const handleFocus = () => {
      if (!isVisible) {
        handleVisibilityChange()
      }
    }
    
    const handleBlur = () => {
      if (isVisible) {
        setIsVisible(false)
        lastVisibilityTime.current = Date.now()
        onHidden?.()
      }
    }
    
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }, [handleVisibilityChange, isVisible, onHidden])

  return {
    isVisible,
    wasHiddenFor: () => Date.now() - lastVisibilityTime.current
  }
} 