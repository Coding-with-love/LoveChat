import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "@/lib/supabase/client"

interface APIKeyStore {
  keys: Record<string, string>
  isLoading: boolean
  error: string | null
  getKey: (provider: string) => string | undefined
  setKey: (provider: string, key: string) => Promise<void>
  removeKey: (provider: string) => Promise<void>
  hasKey: (provider: string) => boolean
  hasRequiredKeys: (provider?: string) => boolean
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
      getKey: (provider: string) => {
        const state = get()
        const normalizedProvider = provider.toLowerCase()
        console.log("🔑 Getting API key for provider:", provider, "→", normalizedProvider)
        console.log("🔑 Available keys:", Object.keys(state.keys))
        const key = state.keys[normalizedProvider]
        console.log("🔑 Found key:", !!key, "Length:", key?.length || 0)
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

          // Check if key already exists
          const { data: existingKey } = await supabase
            .from("api_keys")
            .select("id")
            .eq("user_id", user.id)
            .eq("provider", normalizedProvider)
            .single()

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
        const hasKey = !!state.keys[normalizedProvider]
        console.log("🔍 Checking if required API key exists for provider:", provider, "Has key:", hasKey)
        return hasKey
      },
      getAllKeys: () => {
        const state = get()
        const providers = Object.keys(state.keys)
        console.log("📋 All stored keys providers:", providers)
        return state.keys
      },
      loadKeys: async () => {
        // Prevent concurrent loadKeys calls
        const state = get()
        if (state.isLoading) {
          console.log("🔄 loadKeys already in progress, skipping...")
          return
        }

        try {
          set({ isLoading: true, error: null })
          
          // Get current user
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error("User not authenticated")

          // Fetch all API keys for user
          const { data: apiKeys, error } = await supabase
            .from("api_keys")
            .select("provider, api_key")
            .eq("user_id", user.id)

          if (error) throw error

          // Convert to Record<string, string>
          const keys = (apiKeys || []).reduce((acc, { provider, api_key }) => {
            acc[provider.toLowerCase()] = api_key
            return acc
          }, {} as Record<string, string>)

          set({ keys })
          console.log("✅ API keys loaded from database")
        } catch (error) {
          console.error("❌ Error loading API keys:", error)
          set({ error: error instanceof Error ? error.message : "Failed to load API keys" })
          
          // Don't throw error to prevent infinite loading states
          // The UI can handle the error state gracefully
        } finally {
          // Always ensure loading state is cleared
          set({ isLoading: false })
          console.log("🔄 loadKeys loading state cleared")
        }
      },
      debug: () => {
        const state = get()
        console.log("🔍 API Key Store Debug:")
        console.log("Keys:", Object.keys(state.keys))
        console.log("Has OpenAI key:", !!state.keys["openai"])
        console.log("Has Google key:", !!state.keys["google"])
        console.log("Has OpenRouter key:", !!state.keys["openrouter"])
      }
    }),
    {
      name: "api-key-storage", // name of the item in localStorage
      version: 1,
      // Enable proper hydration to restore state on tab switches
    }
  )
)
