import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "@/lib/supabase/client"

interface APIKeyStore {
  keys: Record<string, string>
  isLoading: boolean
  error: string | null
  hasInitialized: boolean
  getKey: (provider: string) => string | undefined
  setKey: (provider: string, key: string) => Promise<void>
  removeKey: (provider: string) => Promise<void>
  hasKey: (provider: string) => boolean
  hasRequiredKeys: (provider?: string) => boolean
  hasDefaultKeys: (provider: string) => Promise<boolean>
  isUsingDefaultKey: (provider: string) => Promise<boolean>
  getAllKeys: () => Record<string, string>
  loadKeys: () => Promise<void>
  debug: () => void
}

export const useAPIKeyStore = create<APIKeyStore>()(
  persist(
    (set, get) => ({
      keys: {},
      isLoading: false,
      error: null,
      hasInitialized: false,
      getKey: (provider: string) => {
        const state = get()
        const normalizedProvider = provider.toLowerCase()
        const key = state.keys[normalizedProvider]
        // Only log when debugging is needed, not on every call
        // console.log("🔑 Getting API key for provider:", provider, "→", normalizedProvider)
        // console.log("🔑 Available keys:", Object.keys(state.keys))
        // console.log("🔑 Found key:", !!key, "Length:", key?.length || 0)
        return key
      },
      setKey: async (provider: string, key: string) => {
        const normalizedProvider = provider.toLowerCase()
        console.log("💾 Setting API key for provider:", provider, "→", normalizedProvider, "Length:", key.length)
        
        try {
          set({ isLoading: true, error: null })
          
          // Update local state immediately for better UX
          set((state) => ({
            keys: { ...state.keys, [normalizedProvider]: key }
          }))
          console.log("🔄 Local state updated immediately")
          
          // Get current user
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error("User not authenticated")
          console.log("👤 User authenticated for setKey:", user.id)

          // Check if key already exists
          const { data: existingKey, error: selectError } = await supabase
            .from("api_keys")
            .select("id")
            .eq("user_id", user.id)
            .eq("provider", normalizedProvider)
            .single()
          
          if (selectError && selectError.code !== 'PGRST116') {
            console.error("❌ Error checking existing key:", selectError)
          }

          if (existingKey) {
            // Update existing key
            const { error } = await supabase
              .from("api_keys")
              .update({
                api_key: key,
                updated_at: new Date().toISOString()
              })
              .eq("id", existingKey.id)

            if (error) throw error
            console.log("✅ Updated existing API key in database")
          } else {
            // Insert new key
            const { error } = await supabase
              .from("api_keys")
              .insert({
                user_id: user.id,
                provider: normalizedProvider,
                api_key: key,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (error) throw error
            console.log("✅ Inserted new API key in database")
          }

          console.log("✅ API key saved to database successfully")
        } catch (error) {
          console.error("❌ Error saving API key:", error)
          
          // Revert local state on error
          const state = get()
          const revertedKeys = { ...state.keys }
          delete revertedKeys[normalizedProvider]
          set({ keys: revertedKeys })
          console.log("🔄 Reverted local state due to error")
          
          set({ error: error instanceof Error ? error.message : "Failed to save API key" })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      removeKey: async (provider: string) => {
        const normalizedProvider = provider.toLowerCase()
        console.log("🗑️ Removing API key for provider:", provider, "→", normalizedProvider)
        
        try {
          set({ isLoading: true, error: null })
          
          // Get current user
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error("User not authenticated")

          // Delete from database
          const { error } = await supabase
            .from("api_keys")
            .delete()
            .eq("user_id", user.id)
            .eq("provider", normalizedProvider)

          if (error) throw error

          // Update local state
          set((state) => {
            const newKeys = { ...state.keys }
            delete newKeys[normalizedProvider]
            return { keys: newKeys }
          })

          console.log("✅ API key removed from database")
          
          // Trigger cleanup of favorites for models that no longer have API keys
          // Import the ModelStore dynamically to avoid circular imports
          const { useModelStore } = await import("./ModelStore")
          useModelStore.getState().cleanupFavoritesForRemovedProviders()
        } catch (error) {
          console.error("❌ Error removing API key:", error)
          set({ error: error instanceof Error ? error.message : "Failed to remove API key" })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      hasKey: (provider: string) => {
        const state = get()
        const normalizedProvider = provider.toLowerCase()
        const hasKey = !!state.keys[normalizedProvider]
        console.log("🔍 Checking if key exists for provider:", provider, "→", normalizedProvider, "Has key:", hasKey)
        return hasKey
      },
      hasRequiredKeys: (provider?: string) => {
        const state = get()
        if (!provider || provider === "ollama") {
          return true
        }
        const normalizedProvider = provider.toLowerCase()
        const hasUserKey = !!state.keys[normalizedProvider]
        console.log("🔍 Checking if required API key exists for provider:", provider, "Has user key:", hasUserKey)
        
        // Provider-specific requirements
        if (normalizedProvider === "openai" || normalizedProvider === "openrouter") {
          // OpenAI and OpenRouter require user-provided API keys
          return hasUserKey
        } else if (normalizedProvider === "google") {
          // Google is optional - server has fallback
          return true
        } else {
          // For other providers, require user key
          return hasUserKey
        }
      },
      hasDefaultKeys: async (provider: string) => {
        const normalizedProvider = provider.toLowerCase()
        
        try {
          // Check if server has default keys by making a test request
          const response = await fetch("/api/check-default-keys", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ provider: normalizedProvider }),
          })
          
          if (!response.ok) {
            return false
          }
          
          const data = await response.json()
          console.log("🔍 Default API key check for provider:", provider, "Has default key:", data.hasDefaultKey)
          return data.hasDefaultKey
        } catch (error) {
          console.error("❌ Error checking default API keys:", error)
          return false
        }
      },
      isUsingDefaultKey: async (provider: string) => {
        const state = get()
        const normalizedProvider = provider.toLowerCase()
        const hasUserKey = !!state.keys[normalizedProvider]
        
        // If user has their own key, they're not using default
        if (hasUserKey) {
          return false
        }
        
        // Check if default key is available
        return await get().hasDefaultKeys(provider)
      },
      getAllKeys: () => {
        const state = get()
        const providers = Object.keys(state.keys)
        console.log("📋 All stored keys providers:", providers)
        return state.keys
      },
      loadKeys: async () => {
        // Prevent concurrent loadKeys calls and check if already initialized
        const state = get()
        if (state.isLoading) {
          console.log("🔄 loadKeys already in progress, skipping...")
          return
        }
        
        if (state.hasInitialized) {
          console.log("🔄 loadKeys already completed, skipping...")
          return
        }

        // Set a shorter timeout to clear loading state if it takes too long
        const loadingTimeout = setTimeout(() => {
          const currentState = get()
          if (currentState.isLoading) {
            console.warn("⚠️ loadKeys timeout - clearing loading state")
            set({ isLoading: false, hasInitialized: true, error: "Loading timeout" })
          }
        }, 5000) // Reduced from 10 to 5 seconds

        try {
          set({ isLoading: true, error: null })
          console.log("🔄 loadKeys: Starting database query...")
          
          // Get current user with a timeout
          const userPromise = supabase.auth.getUser()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("User authentication timeout")), 3000)
          )
          
          const { data: { user } } = await Promise.race([userPromise, timeoutPromise]) as any
          
          if (!user) {
            console.log("👤 No user found, skipping loadKeys")
            set({ isLoading: false, keys: {}, hasInitialized: true }) // Mark as initialized even with no user
            return
          }
          console.log("👤 User authenticated for loadKeys:", user.id)

          // Fetch all API keys for user with timeout
          const keysPromise = supabase
            .from("api_keys")
            .select("provider, api_key")
            .eq("user_id", user.id)
          
          const keysTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Database query timeout")), 3000)
          )
          
          const { data: apiKeys, error } = await Promise.race([keysPromise, keysTimeoutPromise]) as any
          
          console.log("🔍 Raw database response:", { 
            apiKeys, 
            error,
            apiKeysCount: apiKeys?.length || 0,
            apiKeysProviders: apiKeys?.map((k: any) => k.provider) || []
          })

          if (error) throw error

          // Convert to Record<string, string>
          const keys = (apiKeys || []).reduce((acc: Record<string, string>, { provider, api_key }: { provider: string; api_key: string }) => {
            acc[provider.toLowerCase()] = api_key
            return acc
          }, {} as Record<string, string>)

          console.log("🔍 Processed keys:", {
            keyCount: Object.keys(keys).length,
            providers: Object.keys(keys)
          })

          set({ keys, hasInitialized: true })
          
          if (Object.keys(keys).length === 0) {
            console.log("✅ No API keys found in database (this is normal for new users)")
          } else {
            console.log("✅ API keys loaded from database:", Object.keys(keys))
          }
        } catch (error) {
          console.error("❌ Error loading API keys:", error)
          set({ error: error instanceof Error ? error.message : "Failed to load API keys", hasInitialized: true })
        } finally {
          clearTimeout(loadingTimeout)
          set({ isLoading: false })
          console.log("🔄 loadKeys: Loading state cleared")
        }
      },
      debug: () => {
        const state = get()
        console.log("🔍 APIKeyStore Debug:")
        console.log("Keys:", Object.keys(state.keys))
        console.log("Loading:", state.isLoading)
        console.log("Error:", state.error)
      }
    }),
    {
      name: "api-key-store",
      version: 1,
      skipHydration: true, // Skip automatic hydration since we handle it manually
    }
  )
)
