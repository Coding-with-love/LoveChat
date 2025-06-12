"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { AI_MODELS, getModelConfig, type AIModel, type OllamaModel } from "@/lib/models"
import { useAPIKeyStore } from "./APIKeyStore"

interface ModelState {
  selectedModel: AIModel
  enabledModels: AIModel[]
  setModel: (model: AIModel) => void
  toggleModel: (model: AIModel) => void
  getModelConfig: () => ReturnType<typeof getModelConfig>
  customModels: OllamaModel[]
  addCustomModel: (model: OllamaModel) => void
  removeCustomModel: (model: OllamaModel) => void
  findFirstAvailableModel: () => AIModel
  getEnabledModels: () => AIModel[]
  ensureValidSelectedModel: () => void
}

const DEFAULT_MODEL = "gemini-2.0-flash-exp" as const

// Default enabled models - a curated selection
const DEFAULT_ENABLED_MODELS: AIModel[] = [
  "gemini-2.0-flash-exp",
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet-20241022",
]

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: DEFAULT_MODEL,
      enabledModels: DEFAULT_ENABLED_MODELS,
      customModels: [] as OllamaModel[],
      
      setModel: (model: AIModel) => set({ selectedModel: model }),
      
      toggleModel: (model: AIModel) => {
        set((state) => {
          const isEnabled = state.enabledModels.includes(model)
          const newEnabledModels = isEnabled
            ? state.enabledModels.filter(m => m !== model)
            : [...state.enabledModels, model]
          
          // If we're disabling the currently selected model, switch to first available
          let newSelectedModel = state.selectedModel
          if (isEnabled && state.selectedModel === model) {
            const availableModels = newEnabledModels.filter(m => {
              try {
                const modelConfig = getModelConfig(m)
                if (modelConfig.provider === "ollama") return true
                return !!useAPIKeyStore.getState().getKey(modelConfig.provider)
              } catch {
                return false
              }
            })
            if (availableModels.length > 0) {
              newSelectedModel = availableModels[0]
            }
          }
          
          return { 
            enabledModels: newEnabledModels,
            selectedModel: newSelectedModel
          }
        })
      },
      
      getModelConfig: () => getModelConfig(get().selectedModel),
      
      addCustomModel: (model: OllamaModel) => {
        set((state) => ({
          customModels: [...state.customModels, model],
        }))
      },
      
      removeCustomModel: (model: OllamaModel) => {
        set((state) => ({
          customModels: state.customModels.filter((m) => m !== model),
          enabledModels: state.enabledModels.filter((m) => m !== model),
          selectedModel: state.selectedModel === model ? get().findFirstAvailableModel() : state.selectedModel,
        }))
      },
      
      getEnabledModels: () => {
        const state = get()
        const getKey = useAPIKeyStore.getState().getKey
        
        return [...state.enabledModels, ...state.customModels].filter(model => {
          try {
            const modelConfig = getModelConfig(model)
            if (modelConfig.provider === "ollama") return true
            return !!getKey(modelConfig.provider)
          } catch {
            // If getModelConfig throws an error, exclude this model
            return false
          }
        })
      },
      
      findFirstAvailableModel: () => {
        const state = get()
        const enabledModels = state.getEnabledModels()
        
        if (enabledModels.length > 0) {
          return enabledModels[0]
        }
        
        // Fallback to any available model
        const getKey = useAPIKeyStore.getState().getKey
        for (const model of AI_MODELS) {
          try {
            const modelConfig = getModelConfig(model)
            if (modelConfig.provider === "ollama" || getKey(modelConfig.provider)) {
              return model
            }
          } catch {
            // Skip models that cause errors
            continue
          }
        }
        
        return DEFAULT_MODEL
      },

      ensureValidSelectedModel: () => {
        const state = get()
        const enabledModels = state.getEnabledModels()
        
        // Check if current selected model is available
        const isCurrentModelAvailable = enabledModels.includes(state.selectedModel)
        
        if (!isCurrentModelAvailable && enabledModels.length > 0) {
          // Switch to first available model
          set({ selectedModel: enabledModels[0] })
        }
      }
    }),
    {
      name: "model-settings",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migration for new enabledModels feature
          return {
            ...persistedState,
            enabledModels: DEFAULT_ENABLED_MODELS,
          }
        }
        return persistedState
      },
    },
  ),
)
