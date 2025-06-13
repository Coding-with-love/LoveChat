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
        const apiKeyStore = useAPIKeyStore.getState()
        const getKey = apiKeyStore.getKey
        const isLoading = apiKeyStore.isLoading
        
        return [...state.enabledModels, ...state.customModels].filter(model => {
          try {
            const modelConfig = getModelConfig(model)
            if (modelConfig.provider === "ollama") return true
            
            // Always check if the key actually exists
            const hasKey = !!getKey(modelConfig.provider)
            
            // If we have a key, always include the model
            if (hasKey) {
              return true
            }
            
            // During loading, only preserve the currently selected model
            // This prevents losing the user's selection while still being conservative about which models to show
            if (isLoading && model === state.selectedModel) {
              return true
            }
            
            // Otherwise, exclude models without keys
            return false
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
        const apiKeyStore = useAPIKeyStore.getState()
        const isLoading = apiKeyStore.isLoading
        const enabledModels = state.getEnabledModels()
        
        // Check if current selected model is available
        const isCurrentModelAvailable = enabledModels.includes(state.selectedModel)
        
        // If the model is not available and we're not currently loading API keys,
        // then it's safe to switch to another model
        if (!isCurrentModelAvailable && !isLoading && enabledModels.length > 0) {
          console.log("🔄 Model validation: switching from", state.selectedModel, "to", enabledModels[0])
          set({ selectedModel: enabledModels[0] })
        } else if (!isCurrentModelAvailable && isLoading) {
          console.log("🔄 Model validation: API keys loading, preserving current model", state.selectedModel)
          // Don't switch models while API keys are loading - preserve user's selection
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
