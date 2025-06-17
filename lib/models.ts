export const AI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gemini-2.0-flash-exp",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash-thinking-exp",
  "gemini-2.5-pro-preview-06-05",
  "gemini-2.5-flash-preview-05-20",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "llama-3.1-405b-instruct",
  "llama-3.1-70b-instruct",
  "llama-3.1-8b-instruct",
  "qwen/qwen3-8b:free",
  "o1-preview",
  "o1-mini",
  "o3",
  "o3-mini",
  "o4-mini",
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
    case "gpt-4o":
      return {
        provider: "openai",
        modelId: "gpt-4o",
        name: "gpt-4o",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gpt-4o-mini":
      return {
        provider: "openai",
        modelId: "gpt-4o-mini",
        name: "gpt-4o-mini",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gpt-4-turbo":
      return {
        provider: "openai",
        modelId: "gpt-4-turbo",
        name: "gpt-4-turbo",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "o1-preview":
      return {
        provider: "openai",
        modelId: "o1-preview",
        name: "o1-preview",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "o1-mini":
      return {
        provider: "openai",
        modelId: "o1-mini",
        name: "o1-mini",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "o3":
      return {
        provider: "openai",
        modelId: "o3",
        name: "o3",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "o3-mini":
      return {
        provider: "openai",
        modelId: "o3-mini",
        name: "o3-mini",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "o4-mini":
      return {
        provider: "openai",
        modelId: "o4-mini",
        name: "o4-mini",
        headerKey: "X-OpenAI-API-Key",
        supportsSearch: false,
        supportsThinking: true,
      }
    case "gemini-2.0-flash-exp":
      return {
        provider: "google",
        modelId: "gemini-2.0-flash-exp",
        name: "gemini-2.0-flash-exp",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gemini-1.5-pro":
      return {
        provider: "google",
        modelId: "gemini-1.5-pro",
        name: "gemini-1.5-pro",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gemini-1.5-flash":
      return {
        provider: "google",
        modelId: "gemini-1.5-flash",
        name: "gemini-1.5-flash",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
    case "gemini-2.0-flash-thinking-exp":
      return {
        provider: "google",
        modelId: "gemini-2.0-flash-thinking-exp",
        name: "gemini-2.0-flash-thinking-exp",
        headerKey: "X-Google-API-Key",
        // Thinking models support search too
        supportsSearch: true,
        supportsThinking: true, // Re-enabled with proper implementation
      }
    case "gemini-2.5-pro-preview-06-05":
      return {
        provider: "google",
        modelId: "gemini-2.5-pro-preview-06-05",
        name: "gemini-2.5-pro-preview-06-05",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: true, // Re-enabled with proper implementation
      }
    case "gemini-2.5-flash-preview-05-20":
      return {
        provider: "google",
        modelId: "gemini-2.5-flash-preview-05-20",
        name: "gemini-2.5-flash-preview-05-20",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: true, // Re-enabled with proper implementation
      }
    case "claude-3-5-sonnet-20241022":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-3.5-sonnet:beta",
        name: "claude-3-5-sonnet-20241022",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "claude-3-5-haiku-20241022":
      return {
        provider: "openrouter",
        modelId: "anthropic/claude-3.5-haiku",
        name: "claude-3-5-haiku-20241022",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "llama-3.1-405b-instruct":
      return {
        provider: "openrouter",
        modelId: "meta-llama/llama-3.1-405b-instruct",
        name: "llama-3.1-405b-instruct",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "llama-3.1-70b-instruct":
      return {
        provider: "openrouter",
        modelId: "meta-llama/llama-3.1-70b-instruct",
        name: "llama-3.1-70b-instruct",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "llama-3.1-8b-instruct":
      return {
        provider: "openrouter",
        modelId: "meta-llama/llama-3.1-8b-instruct",
        name: "llama-3.1-8b-instruct",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    case "qwen/qwen3-8b:free":
      return {
        provider: "openrouter",
        modelId: "qwen/qwen3-8b:free",
        name: "qwen/qwen3-8b:free",
        headerKey: "X-OpenRouter-API-Key",
        supportsSearch: false,
        supportsThinking: false,
      }
    default:
      console.warn(`Unknown model: ${model}. Falling back to default model: ${AI_MODELS[0]}`)
      // Return config for the first available model as fallback
      return {
        provider: "google",
        modelId: "gemini-2.0-flash-exp",
        name: "gemini-2.0-flash-exp",
        headerKey: "X-Google-API-Key",
        supportsSearch: true,
        supportsThinking: false,
      }
  }
}
