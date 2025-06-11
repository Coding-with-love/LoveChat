"use client"

import APIKeyManager from "@/frontend/components/APIKeyForm"
import Chat from "@/frontend/components/Chat"
import { v4 as uuidv4 } from "uuid"
import { useAPIKeyStore } from "../stores/APIKeyStore"
import { useModelStore } from "../stores/ModelStore"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useMemo, useEffect } from "react"

export default function Home() {
  const { user } = useAuth()
  const selectedModel = useModelStore((state) => state.selectedModel)
  const modelConfig = useMemo(() => useModelStore.getState().getModelConfig(), [selectedModel])
  const hasRequiredKeys = useAPIKeyStore((state) => state.hasRequiredKeys(modelConfig.provider))
  const loadKeys = useAPIKeyStore((state) => state.loadKeys)
  const isLoading = useAPIKeyStore((state) => state.isLoading)

  // Load API keys when component mounts
  useEffect(() => {
    if (user) {
      loadKeys().catch(console.error)
    }
  }, [user, loadKeys])

  // Show loading while stores are hydrating or API keys are loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
