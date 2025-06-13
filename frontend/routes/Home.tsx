"use client"

import APIKeyManager from "@/frontend/components/APIKeyForm"
import Chat from "@/frontend/components/Chat"
import { v4 as uuidv4 } from "uuid"
import { useAPIKeyStore } from "../stores/APIKeyStore"
import { useModelStore } from "../stores/ModelStore"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useMemo, useEffect, useState } from "react"

export default function Home() {
  const { user } = useAuth()
  const selectedModel = useModelStore((state) => state.selectedModel)
  const modelConfig = useMemo(() => useModelStore.getState().getModelConfig(), [selectedModel])
  const hasRequiredKeys = useAPIKeyStore((state) => state.hasRequiredKeys(modelConfig.provider))
  const loadKeys = useAPIKeyStore((state) => state.loadKeys)
  const isLoading = useAPIKeyStore((state) => state.isLoading)
  const getAllKeys = useAPIKeyStore((state) => state.getAllKeys)

  // Local loading state to prevent conflicts with global hydration
  const [localLoading, setLocalLoading] = useState(true)

  // Check if we have keys and set local loading state
  useEffect(() => {
    const checkKeys = () => {
      const keys = getAllKeys()
      const hasKeys = Object.keys(keys).length > 0
      
      console.log("🏠 Home - Checking API keys:", {
        hasKeys,
        keyCount: Object.keys(keys).length,
        isAPILoading: isLoading,
        hasRequiredKeys: hasRequiredKeys
      })

      // If we have keys or the API key store is not loading, we can show content
      if (hasKeys || !isLoading) {
        setLocalLoading(false)
      }
    }

    // Check immediately
    checkKeys()

    // If still no keys and not loading, try to load once
    if (!hasRequiredKeys && !isLoading && user) {
      console.log("🏠 Home - Loading API keys...")
      loadKeys().finally(() => {
        setLocalLoading(false)
      })
    }
  }, [user, hasRequiredKeys, isLoading, getAllKeys, loadKeys])

  // Show loading while checking for keys
  if (localLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  // Show API key manager if keys are missing
  if (!hasRequiredKeys) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full max-w-3xl pt-10 pb-44 mx-auto">
        <APIKeyManager />
      </div>
    )
  }

  // User is authenticated and has API keys, show chat
  return <Chat threadId={uuidv4()} initialMessages={[]} />
}
