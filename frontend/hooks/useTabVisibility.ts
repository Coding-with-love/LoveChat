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
  const { onVisible, onHidden, refreshStoresOnVisible = true } = options
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
      
      // Global refresh coordination to prevent multiple components from refreshing stores simultaneously
      if (refreshStoresOnVisible && wasHiddenFor > 1000 && user && !isGlobalRefreshInProgress) {
        const timeSinceLastGlobalRefresh = now - lastGlobalRefreshTime
        
        // Only allow one global refresh every 2 seconds
        if (timeSinceLastGlobalRefresh > 2000) {
          isGlobalRefreshInProgress = true
          lastGlobalRefreshTime = now
          
          console.log(`🔄 [${componentId.current}] Coordinating global store refresh`)
          
          try {
            // Only refresh API keys from database, don't rehydrate stores
            // Store rehydration can disrupt API key state during message sending
            await loadKeys()
            
            console.log(`✅ [${componentId.current}] API keys refreshed successfully`)
          } catch (error) {
            console.error(`❌ [${componentId.current}] Error refreshing API keys:`, error)
          } finally {
            isGlobalRefreshInProgress = false
          }
        } else {
          console.log(`🔄 [${componentId.current}] Skipping refresh - too soon after last global refresh (${timeSinceLastGlobalRefresh}ms ago)`)
        }
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