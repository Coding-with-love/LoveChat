import { useEffect, useRef } from "react"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useAuth } from "@/frontend/components/AuthProvider"

/**
 * Debug hook to monitor tab visibility changes and state management
 * This can be temporarily added to components to debug the tab switching issue
 */
export function useVisibilityDebugger(componentName: string) {
  const { user } = useAuth()
  const apiKeys = useAPIKeyStore((state) => state.keys)
  const selectedModel = useModelStore((state) => state.selectedModel)
  const visibilityChangeCount = useRef(0)
  const lastStateSnapshot = useRef<any>({})

  useEffect(() => {
    const logStateSnapshot = () => {
      const currentState = {
        timestamp: new Date().toISOString(),
        user: user?.id,
        apiKeysCount: Object.keys(apiKeys).length,
        selectedModel,
        visibility: document.visibilityState,
        url: window.location.href,
      }

      const hasChanged = JSON.stringify(currentState) !== JSON.stringify(lastStateSnapshot.current)

      if (hasChanged) {
        console.group(`🔍 [${componentName}] State Snapshot #${++visibilityChangeCount.current}`)
        console.log("Current State:", currentState)
        if (lastStateSnapshot.current.timestamp) {
          console.log("Previous State:", lastStateSnapshot.current)
          console.log("Changes:", {
            userChanged: currentState.user !== lastStateSnapshot.current.user,
            apiKeysChanged: currentState.apiKeysCount !== lastStateSnapshot.current.apiKeysCount,
            modelChanged: currentState.selectedModel !== lastStateSnapshot.current.selectedModel,
            visibilityChanged: currentState.visibility !== lastStateSnapshot.current.visibility,
          })
        }
        console.groupEnd()
        lastStateSnapshot.current = currentState
      }
    }

    const handleVisibilityChange = () => {
      console.log(`🔄 [${componentName}] Visibility changed to:`, document.visibilityState)
      logStateSnapshot()
    }

    const handleFocus = () => {
      console.log(`🔄 [${componentName}] Window focused`)
      logStateSnapshot()
    }

    const handleBlur = () => {
      console.log(`🔄 [${componentName}] Window blurred`)
      logStateSnapshot()
    }

    // Initial snapshot
    logStateSnapshot()

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }, [componentName, user, apiKeys, selectedModel])

  // Log state changes
  useEffect(() => {
    console.log(`🔄 [${componentName}] User changed:`, user?.id || "null")
  }, [componentName, user])

  useEffect(() => {
    console.log(`🔄 [${componentName}] API Keys changed:`, Object.keys(apiKeys))
  }, [componentName, apiKeys])

  useEffect(() => {
    console.log(`🔄 [${componentName}] Selected model changed:`, selectedModel)
  }, [componentName, selectedModel])
} 