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
}

export const useOllamaStore = create<OllamaState>()(
  persist(
    (set, get) => ({
      baseUrl: "http://localhost:11434",
      setBaseUrl: (url: string) => set({ baseUrl: url }),
      isConnected: false,
      setIsConnected: (connected: boolean) => set({ isConnected: connected }),
      availableModels: [],
      setAvailableModels: (models: string[]) => set({ availableModels: models }),
      testConnection: async () => {
        try {
          const baseUrl = get().baseUrl
          console.log("Testing Ollama connection to:", baseUrl)

          const response = await fetch(`/api/ollama/models`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ baseUrl }),
          })

          if (!response.ok) {
            console.error("Failed to connect to Ollama:", response.statusText)
            set({ isConnected: false, availableModels: [] })
            return false
          }

          const data = await response.json()
          console.log("Ollama models:", data.models)

          set({
            isConnected: true,
            availableModels: data.models.map((model: any) => model.name),
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
