"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { AI_MODELS, getModelConfig, type AIModel, type OllamaModel } from "@/lib/models"
import { useAPIKeyStore } from "./APIKeyStore"

interface ModelState {
  selectedModel: AIModel
  setModel: (model: AIModel) => void
  getModelConfig: () => ReturnType<typeof getModelConfig>
  customModels: OllamaModel[]
  addCustomModel: (model: OllamaModel) => void
  removeCustomModel: (model: OllamaModel) => void
  findFirstAvailableModel: () => AIModel
}

const DEFAULT_MODEL = "gemini-2.0-flash-exp" as const

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: DEFAULT_MODEL,
      customModels: [] as OllamaModel[],
      setModel: (model: AIModel) => set({ selectedModel: model }),
      getModelConfig: () => getModelConfig(get().selectedModel),
      addCustomModel: (model: OllamaModel) => {
        set((state) => ({
          customModels: [...state.customModels, model],
        }))
      },
      removeCustomModel: (model: OllamaModel) => {
        set((state) => ({
          customModels: state.customModels.filter((m) => m !== model),
          // If the selected model is being removed, find first available model
          selectedModel: state.selectedModel === model ? get().findFirstAvailableModel() : state.selectedModel,
        }))
      },
      findFirstAvailableModel: () => {
        // First try Ollama models as they don't require API keys
        const state = get()
        if (state.customModels.length > 0) {
          return state.customModels[0] as AIModel // Safe cast since OllamaModel is part of AIModel
        }

        // Then try standard models
        const getKey = useAPIKeyStore.getState().getKey
        for (const model of AI_MODELS) {
          const modelConfig = getModelConfig(model)
          // Ollama models don't need API keys
          if (modelConfig.provider === "ollama") {
            return model
          }
          // Check if we have the API key for this model
          const apiKey = getKey(modelConfig.provider)
          if (apiKey) {
            return model
          }
        }

        // If no model is available, return the default
        return DEFAULT_MODEL
      }
    }),
    {
      name: "model-settings",
      // Add migration to handle old model names and missing API keys
      migrate: (persistedState: unknown): ModelState => {
        const state = persistedState as ModelState
        
        // If the persisted model doesn't exist in current models, find first available
        if (
          state?.selectedModel &&
          !AI_MODELS.includes(state.selectedModel as (typeof AI_MODELS)[number]) &&
          !(typeof state.selectedModel === "string" && state.selectedModel.startsWith("ollama:"))
        ) {
          console.log("🔄 Migrating old model:", state.selectedModel, "to first available")
          const store = useModelStore.getState()
          return {
            ...state,
            selectedModel: store.findFirstAvailableModel(),
          }
        }

        // Check if we have the API key for the selected model
        const modelConfig = getModelConfig(state.selectedModel)
        if (modelConfig.provider !== "ollama") {
          const getKey = useAPIKeyStore.getState().getKey
          const apiKey = getKey(modelConfig.provider)
          if (!apiKey) {
            console.log("🔄 Selected model requires API key, switching to first available")
            const store = useModelStore.getState()
            return {
              ...state,
              selectedModel: store.findFirstAvailableModel(),
            }
          }
        }

        return state
      },
      version: 1,
    },
  ),
)
