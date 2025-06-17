export const AI_MODELS = [
  "gpt-40-mini",
  "gpt-4o",
  "gpt-4.1",
  "gpt-4.1-nano",
  "gpt-4.5",
  "o3-mini",
  "o4-mini",
  "o3",
  "o3-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-thinking",
  "gemini-2.5-pro",
  "anthropic/claude-3.5-haiku",
  "anthropic/claude-v3.5-sonnet",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3.7-sonnet-reasoning",
  "anthropic/claude-4-opus-20250514",
  "deepseek/deepseek-r1-0528:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "qwen/qwen3-8b:free",
  "qwen/qwen3-14b:free",
  "qwen/qwen3-32b:free",
  // Ollama models will be added dynamically
] as const

// Define a type for Ollama models that can be added at runtime
export type OllamaModel = `ollama:${string}`

// Update the AIModel type to include Ollama models
export type AIModel = (typeof AI_MODELS)[number] | OllamaModel

interface ModelConfig {
  provider: "openai" | "google" | "openrouter" | "ollama"
  modelId: string
  name: string
  headerKey: string
  supportsSearch?: boolean
  supportsThinking?: boolean
  logo?: {
    type: "image" | "svg" | "text"
    src?: string
    content?: string
    alt: string
  }
}

// List of Ollama models known to support thinking
const OLLAMA_THINKING_MODELS = [
  "deepseek-r1:7b",
  "deepseek-coder",
  "llama3",
  "mistral",
  "mixtral",
  "phi3",
  "qwen2",
  "yi",
  "codellama",
  "wizardcoder",
  "solar",
  "nous-hermes2",
  "openchat",
  "vicuna"
]

export function getModelConfig(model: AIModel): ModelConfig {
  // Check if it's an Ollama model
  if (typeof model === "string" && model.startsWith("ollama:")) {
    const ollamaModelName = model.replace("ollama:", "")
    
    // Check if this Ollama model supports thinking
    // Either by exact match or by checking if it starts with any of the thinking model prefixes
    const supportsThinking = OLLAMA_THINKING_MODELS.some(thinkingModel => 
      ollamaModelName === thinkingModel || 
      ollamaModelName.startsWith(`${thinkingModel}:`) ||
      ollamaModelName.startsWith(`${thinkingModel}-`)
    )
    
    console.log(`🧠 Ollama model ${ollamaModelName} supports thinking: ${supportsThinking}`)
    
    return {
      provider: "ollama",
      modelId: ollamaModelName,
      name: model,
      headerKey: "X-Ollama-Base-URL",
      supportsSearch: false,
      supportsThinking: supportsThinking,
    }
  }

  // Handle standard models
  switch (model) {
    case "gpt-40-mini":
      return {
        provider: "openai",
        modelId: "gpt-4o-mini",
        name: "GPT-4o Mini",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gpt-4o":
      return {
        provider: "openai",
        modelId: "gpt-4o",
        name: "GPT-4o",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gpt-4.1":
      return {
        provider: "openai",
        modelId: "gpt-4.1",
        name: "GPT-4.1",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gpt-4.1-nano":
      return {
        provider: "openai",
        modelId: "gpt-4.1-nano",
        name: "GPT-4.1 Nano",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gpt-4.5":
      return {
        provider: "openai",
        modelId: "gpt-4.5",
        name: "GPT-4.5",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
      case "o3-mini":
        return {
          provider: "openai",
          modelId: "o3-mini",
          name: "O3 Mini",
          headerKey: "X-OpenAI-API-Key",
          supportsSearch: false,
          supportsThinking: true,
        }
      case "o4-mini":
        return {
          provider: "openai",
          modelId: "o4-mini",
          name: "O4 Mini",
          headerKey: "X-OpenAI-API-Key",
          supportsSearch: false,
          supportsThinking: true,
        }
    case "o3":
      return {
        provider: "openai",
        modelId: "o3",
        name: "O3",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "o3-pro":
      return {
        provider: "openai",
        modelId: "o3-pro",
        name: "O3 Pro",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }

    case "gemini-2.0-flash":
      return {
        provider: "google",
        modelId: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gemini-2.0-flash-lite":
      return {
        provider: "google",
        modelId: "gemini-2.0-flash-lite",
        name: "Gemini 2.0 Flash Lite",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gemini-2.5-flash":
      return {
        provider: "google",
        modelId: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gemini-2.5-flash-thinking":
      return {
        provider: "google",
        modelId: "gemini-2.5-flash-thinking",
        name: "Gemini 2.5 Flash Thinking",
        headerKey: "X-Google-API-Key",
        // Thinking models support search too
        supportsSearch: true,
        supportsThinking: true, // Re-enabled with proper implementation
      }
    case "gemini-2.5-pro":
      return {
        provider: "google",
        modelId: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: true, // Re-enabled with proper implementation
      }
    case "anthropic/claude-3.5-haiku":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-3.5-haiku",
        name: "Claude 3.5 Haiku",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "anthropic/claude-v3.5-sonnet":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-v3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "anthropic/claude-3.7-sonnet":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-3.7-sonnet",
        name: "Claude 3.7 Sonnet",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "anthropic/claude-3.7-sonnet-reasoning":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-3.7-sonnet-reasoning",
        name: "Claude 3.7 Sonnet Reasoning",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "anthropic/claude-4-opus-20250514":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-4-opus-20250514",
        name: "Claude 4 Opus",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "deepseek/deepseek-r1-0528:free":
      return {
        provider: "openrouter",
        modelId: "deepseek/deepseek-r1-0528:free",
        name: "DeepSeek R1 0528",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "meta-llama/llama-4-maverick:free":
      return {
        provider: "openrouter",
        modelId: "meta-llama/llama-4-maverick:free",
        name: "Llama 4 Maverick",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "meta-llama/llama-4-scout:free":
      return {
        provider: "openrouter",
        modelId: "meta-llama/llama-4-scout:free",
        name: "Llama 4 Scout",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "qwen/qwen3-8b:free":
      return {
        provider: "openrouter",
        modelId: "qwen/qwen3-8b:free",
        name: "Qwen 3 8B",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "qwen/qwen3-14b:free":
      return {
        provider: "openrouter",
        modelId: "qwen/qwen3-14b:free",
        name: "Qwen 3 14B",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "qwen/qwen3-32b:free":
      return {
        provider: "openrouter",
        modelId: "qwen/qwen3-32b:free",
        name: "Qwen 3 32B",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    default:
      console.warn(`Unknown model: ${model}. Falling back to default model: ${AI_MODELS[0]}`)
      // Return config for the first available model as fallback
      return {
        provider: "google",
        modelId: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
  }
}
