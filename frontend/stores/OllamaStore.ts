"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface OllamaState {
  baseUrl: string
  setBaseUrl: (url: string) => void
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  availableModels: string[]
  setAvailableModels: (models: string[]) => void
  testConnection: () => Promise<boolean>
  useDirectConnection: boolean
  setUseDirectConnection: (direct: boolean) => void
}

export const useOllamaStore = create<OllamaState>()(
  persist(
    (set, get) => ({
      baseUrl: "http://localhost:11434",
      setBaseUrl: (url: string) => set({ baseUrl: url }),
      isConnected: false,
      useDirectConnection: false, // Direct connection blocked by CORS in production
      setUseDirectConnection: (direct: boolean) => set({ useDirectConnection: direct }),
      setIsConnected: (connected: boolean) => {
        const currentState = get()
        const wasConnected = currentState.isConnected
        
        set({ isConnected: connected })
        
        // If connection status changed, log it and trigger model validation
        if (wasConnected !== connected) {
          console.log(`🦙 Ollama connection status changed: ${wasConnected} → ${connected}`)
          
          // Import and trigger model validation when connection status changes
          // This ensures that if an Ollama model was selected and Ollama disconnects,
          // the model will be automatically switched to an available one
          setTimeout(() => {
            try {
              // We use dynamic import to avoid circular dependency issues
              import('./ModelStore').then((module) => {
                const modelStore = module.useModelStore.getState()
                modelStore.ensureValidSelectedModel()
              })
            } catch (error) {
              console.error("Failed to trigger model validation:", error)
            }
          }, 100)
        }
      },
      availableModels: [],
      setAvailableModels: (models: string[]) => set({ availableModels: models }),
      testConnection: async () => {
        try {
          const { baseUrl, useDirectConnection } = get()
          console.log("Testing Ollama connection to:", baseUrl, "Direct:", useDirectConnection)

          let response

          if (useDirectConnection) {
            // Direct browser request to localhost (works in production!)
            console.log("🔗 Making direct browser request to Ollama")
            try {
              response = await fetch(`${baseUrl}/api/tags`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
                // Important: don't send credentials to avoid CORS issues
                credentials: 'omit',
                mode: 'cors'
              })
            } catch (fetchError) {
              console.log("🔄 Direct connection failed, trying through proxy...")
              // Fallback to proxy method
              response = await fetch(`/api/ollama/models`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ baseUrl }),
              })
            }
          } else {
            // Use server proxy (original method)
            console.log("🔄 Using server proxy for Ollama connection")
            response = await fetch(`/api/ollama/models`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ baseUrl }),
            })
          }

          if (!response.ok) {
            console.error("Failed to connect to Ollama:", response.statusText)
            set({ isConnected: false, availableModels: [] })
            return false
          }

          const data = await response.json()
          console.log("Ollama models:", data.models || data)

          // Handle both direct API response and proxied response formats
          const models = data.models || (data.length ? data : [])
          
          set({
            isConnected: true,
            availableModels: models.map((model: any) => typeof model === 'string' ? model : model.name),
          })
          return true
        } catch (error) {
          console.error("Error connecting to Ollama:", error)
          set({ isConnected: false, availableModels: [] })
          return false
        }
      },
    }),
    {
      name: "ollama-settings",
    },
  ),
)
