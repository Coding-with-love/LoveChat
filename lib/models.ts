export const AI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gemini-2.0-flash-exp",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash-thinking-exp",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "llama-3.1-405b-instruct",
  "llama-3.1-70b-instruct",
  "llama-3.1-8b-instruct",
  // Ollama models will be added dynamically
] as const

// Define a type for Ollama models that can be added at runtime
export type OllamaModel = `ollama:${string}`

// Update the AIModel type to include Ollama models
export type AIModel = (typeof AI_MODELS)[number] | OllamaModel

interface ModelConfig {
  provider: "openai" | "google" | "openrouter" | "ollama"
  modelId: string
  headerKey: string
  supportsSearch?: boolean
}

export function getModelConfig(model: AIModel): ModelConfig {
  // Check if it's an Ollama model
  if (typeof model === "string" && model.startsWith("ollama:")) {
    const ollamaModelName = model.replace("ollama:", "")
    return {
      provider: "ollama",
      modelId: ollamaModelName,
      headerKey: "X-Ollama-Base-URL",
      supportsSearch: false,
    }
  }

  // Handle standard models
  switch (model) {
    case "gpt-4o":
      return {
        provider: "openai",
        modelId: "gpt-4o",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
      }
    case "gpt-4o-mini":
      return {
        provider: "openai",
        modelId: "gpt-4o-mini",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
      }
    case "gpt-4-turbo":
      return {
        provider: "openai",
        modelId: "gpt-4-turbo",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
      }
    case "gemini-2.0-flash-exp":
      return {
        provider: "google",
        modelId: "gemini-2.0-flash-exp",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
      }
    case "gemini-1.5-pro":
      return {
        provider: "google",
        modelId: "gemini-1.5-pro",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
      }
    case "gemini-1.5-flash":
      return {
        provider: "google",
        modelId: "gemini-1.5-flash",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
      }
    case "gemini-2.0-flash-thinking-exp":
      return {
        provider: "google",
        modelId: "gemini-2.0-flash-thinking-exp",
        headerKey: "X-Google-API-Key",
        // Thinking models support search too
        supportsSearch: true,
      }
    case "claude-3-5-sonnet-20241022":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-3.5-sonnet:beta",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
      }
    case "claude-3-5-haiku-20241022":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-3.5-haiku",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
      }
    case "llama-3.1-405b-instruct":
      return {
        provider: "openrouter",
        modelId: "meta-llama/llama-3.1-405b-instruct",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
      }
    case "llama-3.1-70b-instruct":
      return {
        provider: "openrouter",
        modelId: "meta-llama/llama-3.1-70b-instruct",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
      }
    case "llama-3.1-8b-instruct":
      return {
        provider: "openrouter",
        modelId: "meta-llama/llama-3.1-8b-instruct",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
      }
    default:
      console.error("Available models:", AI_MODELS)
      throw new Error(`Unknown model: ${model}. Available models: ${AI_MODELS.join(", ")}`)
  }
}
