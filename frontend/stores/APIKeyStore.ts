import { create } from "zustand"
import { persist } from "zustand/middleware"

interface APIKeyStore {
  keys: Record<string, string>
  getKey: (provider: string) => string | undefined
  setKey: (provider: string, key: string) => void
  removeKey: (provider: string) => void
  hasKey: (provider: string) => boolean
  hasRequiredKeys: () => boolean
  getAllKeys: () => Record<string, string>
  debug: () => void
}

export const useAPIKeyStore = create<APIKeyStore>()(
  persist(
    (set, get) => ({
      keys: {},
      getKey: (provider: string) => {
        const state = get()
        const normalizedProvider = provider.toLowerCase()
        console.log("🔑 Getting API key for provider:", provider, "→", normalizedProvider)
        console.log("🔑 Available keys:", Object.keys(state.keys))
        const key = state.keys[normalizedProvider]
        console.log("🔑 Found key:", !!key, "Length:", key?.length || 0)
        return key
      },
      setKey: (provider: string, key: string) => {
        const normalizedProvider = provider.toLowerCase()
        console.log("💾 Setting API key for provider:", provider, "→", normalizedProvider, "Length:", key.length)
        set((state) => {
          // Create a new keys object to ensure the state update triggers
          const newKeys = { ...state.keys }
          newKeys[normalizedProvider] = key
          return { keys: newKeys }
        })

        // Verify the key was set correctly
        setTimeout(() => {
          const verifyKey = get().keys[normalizedProvider]
          console.log("✅ Verification - Key set correctly:", !!verifyKey, "Length:", verifyKey?.length || 0)
        }, 100)
      },
      removeKey: (provider: string) => {
        const normalizedProvider = provider.toLowerCase()
        console.log("🗑️ Removing API key for provider:", provider, "→", normalizedProvider)
        set((state) => {
          const newKeys = { ...state.keys }
          delete newKeys[normalizedProvider]
          return { keys: newKeys }
        })

        // Verify the key was removed correctly
        setTimeout(() => {
          const verifyKey = get().keys[normalizedProvider]
          console.log("✅ Verification - Key removed correctly:", !verifyKey)
        }, 100)
      },
      hasKey: (provider: string) => {
        const state = get()
        const normalizedProvider = provider.toLowerCase()
        const hasKey = !!state.keys[normalizedProvider]
        console.log("🔍 Checking if key exists for provider:", provider, "→", normalizedProvider, "Has key:", hasKey)
        return hasKey
      },
      hasRequiredKeys: () => {
        const state = get()
        const keys = Object.keys(state.keys)
        const hasAnyKey = keys.length > 0
        console.log("🔍 Checking if any API keys exist:", hasAnyKey, "Keys:", keys)
        return hasAnyKey
      },
      getAllKeys: () => {
        const state = get()
        const providers = Object.keys(state.keys)
        console.log("📋 All stored keys providers:", providers)
        return state.keys
      },
      debug: () => {
        const state = get()
        console.log("🔍 API Key Store Debug:")
        console.log("Keys:", Object.keys(state.keys))
        console.log("Has OpenAI key:", !!state.keys["openai"])
        console.log("Has Google key:", !!state.keys["google"])
        console.log("Has OpenRouter key:", !!state.keys["openrouter"])

        // Check localStorage directly
        try {
          const rawStorage = localStorage.getItem("api-keys-storage")
          console.log("Raw localStorage:", rawStorage)
          const parsedStorage = rawStorage ? JSON.parse(rawStorage) : null
          console.log("Parsed localStorage:", parsedStorage)
        } catch (error) {
          console.error("Error reading localStorage:", error)
        }
      },
    }),
    {
      name: "api-keys-storage",
      version: 1,
    },
  ),
)
