"use client"

import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useState, useEffect, useMemo } from "react"

interface DebugInfo {
  timestamp: string
  visibilityState: string
  user: string | null
  apiKeysCount: number
  selectedModel: string
  currentApiKey: string | null
  url: string
}

export function TabVisibilityDebugger() {
  const { user } = useAuth()
  const apiKeys = useAPIKeyStore((state) => state.keys)
  const getKey = useAPIKeyStore((state) => state.getKey)
  const selectedModel = useModelStore((state) => state.selectedModel)
  
  // Use useMemo to stabilize the modelConfig computation
  const modelConfig = useMemo(() => {
    return useModelStore.getState().getModelConfig()
  }, [selectedModel])
  
  const [debugHistory, setDebugHistory] = useState<DebugInfo[]>([])
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const updateDebugInfo = () => {
      const currentApiKey = getKey(modelConfig.provider)
      const newInfo: DebugInfo = {
        timestamp: new Date().toLocaleTimeString(),
        visibilityState: document.visibilityState,
        user: user?.id || null,
        apiKeysCount: Object.keys(apiKeys).length,
        selectedModel,
        currentApiKey: currentApiKey ? `${currentApiKey.slice(0, 8)}...` : null,
        url: window.location.pathname,
      }
      
      setDebugHistory(prev => [newInfo, ...prev.slice(0, 9)]) // Keep last 10 entries
    }

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
      updateDebugInfo()
    }

    updateDebugInfo()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also update when API keys change
    const interval = setInterval(updateDebugInfo, 2000)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [user, apiKeys, selectedModel, getKey, modelConfig.provider])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg max-w-md border border-gray-700 z-50">
      <div className="font-bold mb-2 text-center">🔍 API Key Debug</div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {debugHistory.map((info, index) => (
          <div key={index} className={`p-2 rounded ${index === 0 ? 'bg-blue-800/50' : 'bg-gray-800/50'}`}>
            <div className="flex justify-between">
              <span>{info.timestamp}</span>
              <span className={info.visibilityState === 'visible' ? 'text-green-400' : 'text-red-400'}>
                {info.visibilityState}
              </span>
            </div>
            <div className="text-gray-300">
              User: {info.user ? '✅' : '❌'} | 
              Keys: {info.apiKeysCount} | 
              Current: {info.currentApiKey ? '✅' : '❌'}
            </div>
            <div className="text-gray-400 text-xs">
              Model: {info.selectedModel.slice(0, 20)}...
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-gray-400 text-xs">
        Watch for API key state changes during tab switching
      </div>
    </div>
  )
} 