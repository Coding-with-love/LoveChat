"use client"

import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { getModelConfig } from "@/lib/models"
import { useEffect } from "react"

export default function APIKeyDebug() {
  const { keys, hasRequiredKeys, debug, isLoading } = useAPIKeyStore()
  const { selectedModel } = useModelStore()

  const modelConfig = getModelConfig(selectedModel)
  const provider = modelConfig.provider.toLowerCase()
  const hasKeyForModel = !!keys[provider]

  useEffect(() => {
    // Run debug on mount
    debug()
  }, [debug])

  const debugInfo = {
    selectedModel,
    modelProvider: provider,
    availableKeys: Object.keys(keys),
    hasRequiredKeys: hasRequiredKeys(),
    hasKeyForModel,
    keyLengths: Object.fromEntries(Object.entries(keys).map(([key, value]) => [key, value ? value.length : 0])),
    isLoading,
  }

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-md">
      <h3 className="font-bold mb-2">API Key Debug</h3>
      <pre className="whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
      <button onClick={debug} className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs">
        Refresh Debug
      </button>
    </div>
  )
}
