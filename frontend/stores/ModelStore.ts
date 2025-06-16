"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { AI_MODELS, getModelConfig, type AIModel, type OllamaModel } from "@/lib/models"
import { useAPIKeyStore } from "./APIKeyStore"
import { useOllamaStore } from "./OllamaStore"
import { supabase } from "@/lib/supabase/client"

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
  loadFromDatabase: () => Promise<void>
  saveToDatabase: () => Promise<void>
  hasLoadedFromDB: boolean
}

const DEFAULT_MODEL = "gemini-2.0-flash-exp" as const

// Default enabled models - a curated selection
const DEFAULT_ENABLED_MODELS: AIModel[] = [
  "gemini-2.0-flash-exp",
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet-20241022",
]

// Helper function to save to database with debouncing
let saveTimeout: NodeJS.Timeout | null = null
const debouncedSave = (saveFunction: () => Promise<void>) => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveFunction().catch(console.error)
  }, 1000) // Save 1 second after last change
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: DEFAULT_MODEL,
      enabledModels: DEFAULT_ENABLED_MODELS,
      customModels: [] as OllamaModel[],
      hasLoadedFromDB: false,
      
      setModel: (model: AIModel) => {
        set({ selectedModel: model })
        if (get().hasLoadedFromDB) {
          debouncedSave(() => get().saveToDatabase())
        }
      },
      
      toggleModel: (model: AIModel) => {
        set((state) => {
          const isEnabled = state.enabledModels.includes(model)
          const newEnabledModels = isEnabled
            ? state.enabledModels.filter(m => m !== model)
            : [...state.enabledModels, model]
          
          // If we're disabling the currently selected model, switch to first available
          let newSelectedModel = state.selectedModel
          if (isEnabled && state.selectedModel === model) {
            const ollamaStore = useOllamaStore.getState()
            const isOllamaConnected = ollamaStore.isConnected
            
            const availableModels = newEnabledModels.filter(m => {
              try {
                const modelConfig = getModelConfig(m)
                if (modelConfig.provider === "ollama") {
                  return isOllamaConnected
                }
                const hasUserKey = !!useAPIKeyStore.getState().getKey(modelConfig.provider)
                // Apply provider-specific requirements
                if (modelConfig.provider === "openai" || modelConfig.provider === "openrouter") {
                  return hasUserKey // Require user key
                } else if (modelConfig.provider === "google") {
                  return true // Google allows server fallback
                } else {
                  return hasUserKey // Other providers require user key
                }
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
        
        if (get().hasLoadedFromDB) {
          debouncedSave(() => get().saveToDatabase())
        }
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
        const ollamaStore = useOllamaStore.getState()
        const getKey = apiKeyStore.getKey
        const isLoading = apiKeyStore.isLoading
        const isOllamaConnected = ollamaStore.isConnected
        
        const filteredModels = [...state.enabledModels, ...state.customModels].filter(model => {
          try {
            const modelConfig = getModelConfig(model)
            if (modelConfig.provider === "ollama") {
              // For production, be more lenient with Ollama models
              // Allow them even if connection test failed, as the user might have a working ngrok setup
              if (!isOllamaConnected) {
                console.log("🦙 Ollama connection test failed, but allowing model for production use:", model)
              }
              return true // Always allow Ollama models - let the chat endpoint handle connection issues
            }
            
            // Check if user has provided their own API key
            const hasUserKey = !!getKey(modelConfig.provider)
            
            // Provider-specific API key requirements
            if (modelConfig.provider === "openai") {
              // OpenAI models require user-provided API key
              if (hasUserKey) {
                console.log("✅ OpenAI model allowed with user API key:", model)
                return true
              } else {
                console.log("❌ OpenAI model blocked - user API key required:", model)
                // During loading, preserve the currently selected model to prevent UI flickering
                if (isLoading && model === state.selectedModel) {
                  return true
                }
                return false
              }
            } else if (modelConfig.provider === "openrouter") {
              // OpenRouter models require user-provided API key
              if (hasUserKey) {
                console.log("✅ OpenRouter model allowed with user API key:", model)
                return true
              } else {
                console.log("❌ OpenRouter model blocked - user API key required:", model)
                // During loading, preserve the currently selected model to prevent UI flickering
                if (isLoading && model === state.selectedModel) {
                  return true
                }
                return false
              }
            } else if (modelConfig.provider === "google") {
              // Google models are optional - can use server fallback
              if (hasUserKey) {
                console.log("✅ Google model allowed with user API key:", model)
              } else {
                console.log("✅ Google model allowed with server fallback API key:", model)
              }
              return true
            } else {
              // For any other providers, require user key
              if (hasUserKey) {
                return true
              } else {
                console.log("❌ Model blocked - user API key required for provider:", modelConfig.provider, model)
                if (isLoading && model === state.selectedModel) {
                  return true
                }
                return false
              }
            }
          } catch {
            // If getModelConfig throws an error, exclude this model
            return false
          }
        })
        
        console.log("🔄 Available models after filtering:", {
          total: filteredModels.length,
          ollamaConnected: isOllamaConnected,
          models: filteredModels.map(m => m.replace("ollama:", ""))
        })
        
        return filteredModels
      },
      
      findFirstAvailableModel: () => {
        const state = get()
        const enabledModels = state.getEnabledModels()
        
        if (enabledModels.length > 0) {
          return enabledModels[0]
        }
        
        // Fallback to any available model
        const getKey = useAPIKeyStore.getState().getKey
        const isOllamaConnected = useOllamaStore.getState().isConnected
        
        for (const model of AI_MODELS) {
          try {
            const modelConfig = getModelConfig(model)
            if (modelConfig.provider === "ollama") {
              // Always consider Ollama models available - let the chat endpoint handle connection
              return model
            } else if (modelConfig.provider === "google") {
              // Google models are optional - can use server fallback
              return model
            } else if (getKey(modelConfig.provider)) {
              // For OpenAI/OpenRouter, require user key
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
        const ollamaStore = useOllamaStore.getState()
        const isLoading = apiKeyStore.isLoading
        const isOllamaConnected = ollamaStore.isConnected
        const enabledModels = state.getEnabledModels()
        
        // Check if current selected model is available
        const isCurrentModelAvailable = enabledModels.includes(state.selectedModel)
        
        // Special check for Ollama models - be more lenient in production
        const isCurrentModelOllama = state.selectedModel.startsWith("ollama:")
        if (isCurrentModelOllama && !isOllamaConnected) {
          console.log("🦙 Current model is Ollama and connection test failed, but keeping model for production")
        }
        
        // If the model is not available and we're not currently loading API keys,
        // then it's safe to switch to another model
        if (!isCurrentModelAvailable && !isLoading && enabledModels.length > 0) {
          console.log("🔄 Model validation: switching from", state.selectedModel, "to", enabledModels[0], 
                     isCurrentModelOllama ? "(Ollama disconnected)" : "(no API key)")
          set({ selectedModel: enabledModels[0] })
        } else if (!isCurrentModelAvailable && isLoading) {
          console.log("🔄 Model validation: API keys loading, preserving current model", state.selectedModel)
          // Don't switch models while API keys are loading - preserve user's selection
        } else if (isCurrentModelAvailable) {
          console.log("🔄 Model validation: current model", state.selectedModel, "is still available")
        }
      },

      loadFromDatabase: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const { data, error } = await supabase
            .from("user_preferences")
            .select("selected_model, enabled_models")
            .eq("user_id", user.id)
            .single()

          if (error && error.code !== "PGRST116") {
            // PGRST116 is "not found" which is fine
            console.error("Failed to load model preferences:", error)
            return
          }

          if (data) {
            console.log("📥 Loading model preferences from database:", data)
            set({
              selectedModel: (data.selected_model as AIModel) || get().selectedModel,
              enabledModels: (data.enabled_models as AIModel[]) || get().enabledModels,
              hasLoadedFromDB: true,
            })
          } else {
            // No preferences in DB, mark as loaded so future changes will save
            set({ hasLoadedFromDB: true })
          }
        } catch (error) {
          console.error("Failed to load model preferences from database:", error)
          set({ hasLoadedFromDB: true })
        }
      },

      saveToDatabase: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const state = get()
          const preferences = {
            selected_model: state.selectedModel,
            enabled_models: state.enabledModels,
          }

          // Check if preferences already exist
          const { data: existing } = await supabase
            .from("user_preferences")
            .select("id")
            .eq("user_id", user.id)
            .single()

          if (existing) {
            // Update existing preferences
            const { error } = await supabase
              .from("user_preferences")
              .update({
                ...preferences,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id)

            if (error) throw error
          } else {
            // Insert new preferences
            const { error } = await supabase
              .from("user_preferences")
              .insert({
                user_id: user.id,
                ...preferences,
              })

            if (error) throw error
          }

          console.log("✅ Model preferences saved to database")
        } catch (error) {
          console.error("Failed to save model preferences to database:", error)
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
