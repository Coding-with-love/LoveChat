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
  favoriteModels: AIModel[]
  toggleFavoriteModel: (model: AIModel) => void
  cleanupFavoritesForRemovedProviders: () => void
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
      favoriteModels: [],

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
            ? state.enabledModels.filter((m) => m !== model)
            : [...state.enabledModels, model]

          // If we're disabling the currently selected model, switch to first available
          let newSelectedModel = state.selectedModel
          if (isEnabled && state.selectedModel === model) {
            const ollamaStore = useOllamaStore.getState()
            const isOllamaConnected = ollamaStore.isConnected

            const availableModels = newEnabledModels.filter((m) => {
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
            selectedModel: newSelectedModel,
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

        const filteredModels = [...state.enabledModels, ...state.customModels].filter((model) => {
          try {
            const modelConfig = getModelConfig(model)
            if (modelConfig.provider === "ollama") {
              // For production, be more lenient with Ollama models
              // Allow them even if connection test failed, but allowing model for production use:", model)
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
          models: filteredModels.map((m) => m.replace("ollama:", "")),
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
          console.log(
            "🔄 Model validation: switching from",
            state.selectedModel,
            "to",
            enabledModels[0],
            isCurrentModelOllama ? "(Ollama disconnected)" : "(no API key)",
          )
          set({ selectedModel: enabledModels[0] })
        } else if (!isCurrentModelAvailable && isLoading) {
          console.log("🔄 Model validation: API keys loading, preserving current model", state.selectedModel)
          // Don't switch models while API keys are loading - preserve user's selection
        } else if (isCurrentModelAvailable) {
          console.log("🔄 Model validation: current model", state.selectedModel, "is still available")
        }
      },
      toggleFavoriteModel: (model: AIModel) => {
        set((state) => {
          const isFavorite = state.favoriteModels.includes(model)
          const newFavoriteModels = isFavorite
            ? state.favoriteModels.filter((m) => m !== model)
            : [...state.favoriteModels, model]
          return { favoriteModels: newFavoriteModels }
        })
        if (get().hasLoadedFromDB) {
          debouncedSave(() => get().saveToDatabase())
        }
      },
      cleanupFavoritesForRemovedProviders: () => {
        const apiKeyStore = useAPIKeyStore.getState()
        const currentFavorites = get().favoriteModels
        
        console.log("🧹 Starting favorites cleanup...")
        console.log("🧹 Current favorites:", currentFavorites)
        console.log("🧹 Available API keys:", Object.keys(apiKeyStore.keys))
        
        const validFavorites = currentFavorites.filter((model) => {
          try {
            const modelConfig = getModelConfig(model)
            console.log(`🧹 Checking model: ${model} (provider: ${modelConfig.provider})`)
            
            // For Ollama models, always keep them (they don't need API keys)
            if (modelConfig.provider === "ollama") {
              console.log(`🧹 Keeping ${model} - Ollama model`)
              return true
            }
            
            // For Google models, keep them (they can use server fallback)
            if (modelConfig.provider === "google") {
              console.log(`🧹 Keeping ${model} - Google model (server fallback available)`)
              return true
            }
            
            // For OpenAI and OpenRouter, only keep if user has API key
            if (modelConfig.provider === "openai" || modelConfig.provider === "openrouter") {
              const hasUserKey = !!apiKeyStore.getKey(modelConfig.provider)
              console.log(`🧹 ${model} (${modelConfig.provider}) - has user key: ${hasUserKey}`)
              if (!hasUserKey) {
                console.log(`🗑️ Removing ${model} from favorites - no ${modelConfig.provider} API key`)
                return false
              }
              console.log(`🧹 Keeping ${model} - has ${modelConfig.provider} API key`)
              return true
            }
            
            // For other providers, check if they have API keys
            const hasUserKey = !!apiKeyStore.getKey(modelConfig.provider)
            console.log(`🧹 ${model} (${modelConfig.provider}) - has user key: ${hasUserKey}`)
            if (!hasUserKey) {
              console.log(`🗑️ Removing ${model} from favorites - no ${modelConfig.provider} API key`)
              return false
            }
            console.log(`🧹 Keeping ${model} - has ${modelConfig.provider} API key`)
            return true
          } catch (error) {
            // If there's an error getting model config, remove from favorites
            console.log(`🗑️ Removing ${model} from favorites - invalid model config:`, error)
            return false
          }
        })
        
        console.log("🧹 Valid favorites after filtering:", validFavorites)
        
        // Only update if there's a change
        if (validFavorites.length !== currentFavorites.length) {
          console.log(`🧹 Cleaned up favorites: ${currentFavorites.length} → ${validFavorites.length}`)
          set({ favoriteModels: validFavorites })
          
          if (get().hasLoadedFromDB) {
            debouncedSave(() => get().saveToDatabase())
          }
        } else {
          console.log("🧹 No cleanup needed - all favorites are still valid")
        }
      },
      loadFromDatabase: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) return

          const { data, error } = await supabase
            .from("user_preferences")
            .select("selected_model, enabled_models, favorite_models")
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
              favoriteModels: (data.favorite_models as AIModel[]) || [],
              hasLoadedFromDB: true,
            })
            
            // Clean up any stale favorites after loading from database
            setTimeout(() => {
              get().cleanupFavoritesForRemovedProviders()
            }, 500) // Small delay to ensure API key store is also loaded
          } else {
            // No preferences in DB, mark as loaded so future changes will save
            set({ hasLoadedFromDB: true })
          }
        } catch (error) {
          console.error("Failed to load model preferences:", error)
          // Still mark as loaded so future changes will attempt to save
          set({ hasLoadedFromDB: true })
        }
      },

      saveToDatabase: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) return

          const state = get()
          const { data, error } = await supabase
            .from("user_preferences")
            .upsert(
              {
                user_id: user.id,
                selected_model: state.selectedModel,
                enabled_models: state.enabledModels,
                favorite_models: state.favoriteModels,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            )
            .select()
            .single()

          if (error) {
            console.error("Failed to save model preferences:", error)
            return
          }

          console.log("📤 Saved model preferences to database:", data)
        } catch (error) {
          console.error("Failed to save model preferences:", error)
        }
      },
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

// Subscribe to API key changes to automatically clean up favorites
let previousApiKeys: Record<string, string> = {}

const setupApiKeySubscription = () => {
  console.log("🔑 Setting up API key subscription for favorites cleanup...")
  
  useAPIKeyStore.subscribe((state) => {
    const currentApiKeys = state.keys
    
    console.log("🔑 API key state changed:", {
      previousKeys: Object.keys(previousApiKeys),
      currentKeys: Object.keys(currentApiKeys),
      hasInitialized: state.hasInitialized
    })
    
    // Only process changes after store has been initialized
    if (!state.hasInitialized) {
      console.log("🔑 API key store not yet initialized, skipping cleanup")
      previousApiKeys = { ...currentApiKeys }
      return
    }
    
    // Check if any API keys were removed
    const removedProviders = Object.keys(previousApiKeys).filter(
      (provider) => previousApiKeys[provider] && !currentApiKeys[provider]
    )
    
    if (removedProviders.length > 0) {
      console.log("🔑 API keys removed for providers:", removedProviders)
      // Trigger cleanup of favorites
      useModelStore.getState().cleanupFavoritesForRemovedProviders()
    } else {
      console.log("🔑 No API keys were removed, no cleanup needed")
    }
    
    previousApiKeys = { ...currentApiKeys }
  })
}

// Set up the subscription after the stores are initialized
setTimeout(setupApiKeySubscription, 100)

// Expose cleanup function for manual testing in development
if (typeof window !== 'undefined') {
  (window as any).cleanupFavorites = () => {
    console.log("🧪 Manual favorites cleanup triggered")
    useModelStore.getState().cleanupFavoritesForRemovedProviders()
  }
  
  (window as any).debugModelStore = () => {
    const state = useModelStore.getState()
    const apiState = useAPIKeyStore.getState()
    console.log("🧪 Model Store Debug:", {
      favoriteModels: state.favoriteModels,
      availableApiKeys: Object.keys(apiState.keys),
      hasLoadedFromDB: state.hasLoadedFromDB
    })
  }
}
