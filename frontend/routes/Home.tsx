"use client"

import APIKeyManager from "@/frontend/components/APIKeyForm"
import Chat from "@/frontend/components/Chat"
import { v4 as uuidv4 } from "uuid"
import { useAPIKeyStore } from "../stores/APIKeyStore"
import { useModelStore } from "../stores/ModelStore"
import { useAuth } from "@/frontend/components/AuthProvider"

export default function Home() {
  const { user } = useAuth()
  const hasRequiredKeys = useAPIKeyStore((state) => state.hasRequiredKeys())

  const isAPIKeysHydrated = useAPIKeyStore.persist?.hasHydrated()
  const isModelStoreHydrated = useModelStore.persist?.hasHydrated()

  // Show loading while stores are hydrating
  if (!isAPIKeysHydrated || !isModelStoreHydrated) {
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
