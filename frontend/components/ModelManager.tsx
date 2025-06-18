"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Input } from "./ui/input"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { AI_MODELS, getModelConfig, type AIModel } from "@/lib/models"
import { ProviderLogo } from "./ProviderLogo"
import {
  Key,
  Globe,
  Zap,
  Search,
  Sparkles,
  Eye,
  FileText,
  Lightbulb,
  CheckSquare,
  Square,
  SlidersHorizontal,
  X,
  Shield,
  ChevronDown,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"

interface ModelInfo {
  model: AIModel
  icon: React.ReactNode
  name: string
  description: string
  provider: string
  features: Array<{
    icon: React.ReactNode
    label: string
    color: string
  }>
  isEnabled: boolean
  hasApiKey: boolean
  isUsingDefaultKey: boolean
  searchUrl?: string
}

interface FilterState {
  providers: string[]
  features: string[]
  capabilities: string[]
  showOnlyAvailable: boolean
  showOnlyFavorites: boolean
}

import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"

export function ModelManager() {
  const { getKey } = useAPIKeyStore()
  const { selectedModel, setModel, enabledModels, toggleModel, customModels, favoriteModels, toggleFavoriteModel } =
    useModelStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDetailModel, setSelectedDetailModel] = useState<AIModel | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    providers: [],
    features: [],
    capabilities: [],
    showOnlyAvailable: false,
    showOnlyFavorites: false,
  })

  // Available filter options
  const filterOptions = {
    providers: [
      { value: "openai", label: "OpenAI", icon: <ProviderLogo provider="openai" size="sm" /> },
      { value: "google", label: "Google", icon: <ProviderLogo provider="google" size="sm" /> },
      { value: "openrouter", label: "OpenRouter", icon: <ProviderLogo provider="openrouter" size="sm" /> },
      { value: "ollama", label: "Ollama", icon: <ProviderLogo provider="ollama" size="sm" /> },
    ],
    features: [
      { value: "search", label: "Search", icon: <Search className="h-3 w-3" />, color: "text-blue-600" },
      { value: "thinking", label: "Thinking", icon: <Sparkles className="h-3 w-3" />, color: "text-purple-600" },
      { value: "vision", label: "Vision", icon: <Eye className="h-3 w-3" />, color: "text-green-600" },
      { value: "pdfs", label: "PDFs", icon: <FileText className="h-3 w-3" />, color: "text-indigo-600" },
      { value: "reasoning", label: "Reasoning", icon: <Lightbulb className="h-3 w-3" />, color: "text-orange-600" },
      { value: "fast", label: "Fast", icon: <Zap className="h-3 w-3" />, color: "text-yellow-600" },
    ],
    capabilities: [
      { value: "latest", label: "Latest Models" },
      { value: "flagship", label: "Flagship Models" },
      { value: "experimental", label: "Experimental" },
    ],
  }

  // Get model info with descriptions and features
  const getModelInfo = (model: AIModel): ModelInfo => {
    const config = getModelConfig(model)
    const features = []
    
    // Add feature badges based on model capabilities
    if (config.supportsSearch) {
      features.push({
        icon: <Search className="h-3 w-3" />,
        label: "Search",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      })
    }
    
    if (config.supportsThinking) {
      features.push({
        icon: <Sparkles className="h-3 w-3" />,
        label: "Thinking",
        color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      })
    }

    // Add Vision for specific models
    if (model.includes("gpt-4") || model.includes("gemini") || model.includes("claude")) {
      features.push({
        icon: <Eye className="h-3 w-3" />,
        label: "Vision",
        color: "bg-green-500/10 text-green-600 border-green-500/20",
      })
    }

    // Add PDFs for certain models
    if (model.includes("gemini") || model.includes("claude")) {
      features.push({
        icon: <FileText className="h-3 w-3" />,
        label: "PDFs",
        color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
      })
    }

    // Add Fast badge for specific models
    if (model.includes("flash") || model.includes("lite") || model.includes("mini")) {
      features.push({
        icon: <Zap className="h-3 w-3" />,
        label: "Fast",
        color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      })
    }

    // Add Reasoning for o1/o3 models
    if (model.includes("o1") || model.includes("o3") || model.includes("reasoning")) {
      features.push({
        icon: <Lightbulb className="h-3 w-3" />,
        label: "Reasoning",
        color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      })
    }

    let providerName: string
    let description: string
    let searchUrl: string | undefined

    switch (config.provider) {
      case "openai":
        providerName = "OpenAI"
        
        // OpenAI model descriptions
        if (model.includes("o3")) {
          description = "OpenAI's most advanced reasoning model, excelling at complex problem-solving."
        } else if (model.includes("o1")) {
          description = "OpenAI's reasoning model that thinks step-by-step through complex problems."
        } else if (model.includes("gpt-4o")) {
          description = "OpenAI's flagship model, known for speed and accuracy (and also web search!)."
        } else if (model.includes("gpt-4-turbo")) {
          description = "Optimized version of GPT-4 with improved performance and efficiency."
        } else {
          description = "Advanced language model from OpenAI."
        }
        break

      case "google":
        providerName = "Google"
        
        // Google model descriptions
        if (model.includes("2.5")) {
          if (model.includes("thinking")) {
            description = "Google's latest fast model, but now it can think!"
          } else if (model.includes("pro")) {
            description = "Google's most advanced model, excelling at complex reasoning and problem-solving."
          } else {
            description = "Google's latest fast model, known for speed and accuracy (and also web search!)."
          }
        } else if (model.includes("2.0")) {
          if (model.includes("lite")) {
            description = "Similar to 2.0 Flash, but even faster."
          } else {
            description = "Google's flagship model, known for speed and accuracy (and also web search!)."
          }
        } else {
          description = "Advanced language model from Google."
        }
        
        searchUrl = "https://gemini.google.com"
        break

      case "openrouter":
        providerName = "OpenRouter"
        description = "Access to various AI models through OpenRouter's unified API."
        break

      case "ollama":
        providerName = "Ollama"
        description = "Run large language models locally on your machine."
        break

      default:
        providerName = "Unknown"
        description = "AI language model."
    }

    const displayName = model.startsWith("ollama:") ? model.replace("ollama:", "") : model
    const icon = <ProviderLogo provider={config.provider} size="lg" />

    const hasUserKey = !!getKey(config.provider)
    let hasApiKey = false
    
    // Determine if model has required API keys based on provider requirements
    if (config.provider === "ollama") {
      hasApiKey = true // Ollama doesn't need API keys
    } else if (config.provider === "google") {
      hasApiKey = true // Google is optional - server has fallback
    } else if (config.provider === "openai" || config.provider === "openrouter") {
      hasApiKey = hasUserKey // OpenAI and OpenRouter require user keys
    } else {
      hasApiKey = hasUserKey // Other providers require user keys
    }

    return {
      model,
      icon,
      name: displayName,
      description,
      provider: providerName,
      features,
      isEnabled: enabledModels.includes(model),
      hasApiKey,
      isUsingDefaultKey: config.provider !== "ollama" && !hasUserKey,
      searchUrl,
    }
  }

  // Check if model matches filters
  const modelMatchesFilters = (modelInfo: ModelInfo): boolean => {
    // Provider filter
    if (filters.providers.length > 0) {
      const providerMatch = filters.providers.some((provider) => modelInfo.provider.toLowerCase() === provider)
      if (!providerMatch) return false
    }

    // Features filter
    if (filters.features.length > 0) {
      const modelFeatures = modelInfo.features.map((f) => f.label.toLowerCase())
      const featureMatch = filters.features.some((feature) => {
        switch (feature) {
          case "search":
            return modelFeatures.includes("search")
          case "thinking":
            return modelFeatures.includes("thinking")
          case "vision":
            return modelFeatures.includes("vision")
          case "pdfs":
            return modelFeatures.includes("pdfs")
          case "reasoning":
            return modelFeatures.includes("reasoning")
          case "fast":
            return modelFeatures.includes("fast")
          default:
            return false
        }
      })
      if (!featureMatch) return false
    }

    // Capabilities filter
    if (filters.capabilities.length > 0) {
      const capabilityMatch = filters.capabilities.some((capability) => {
        switch (capability) {
          case "latest":
            return modelInfo.model.includes("2.5") || modelInfo.model.includes("o3") || modelInfo.model.includes("2.0")
          case "flagship":
            return (
              modelInfo.model.includes("gpt-4o") ||
              modelInfo.model.includes("gemini-2.5-pro") ||
              modelInfo.model.includes("claude-3-5-sonnet")
            )
          case "experimental":
            return (
              modelInfo.model.includes("exp") ||
              modelInfo.model.includes("preview") ||
              modelInfo.model.includes("thinking")
            )
          default:
            return false
        }
      })
      if (!capabilityMatch) return false
    }

    // Show only available filter
    if (filters.showOnlyAvailable && !modelInfo.hasApiKey) {
      return false
    }

    // Show only favorites filter
    if (filters.showOnlyFavorites && !favoriteModels.includes(modelInfo.model)) {
      return false
    }

    return true
  }

  // Get all available models
  const allModels = [...AI_MODELS, ...customModels]
  
  // Filter and search models
  const filteredModels = allModels.map(getModelInfo).filter((modelInfo) => {
    const matchesSearch =
      modelInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           modelInfo.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           modelInfo.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSearch && modelMatchesFilters(modelInfo)
    })

  // Sort models - by provider when no filters, by relevance when filtered
  const hasActiveFilters =
    filters.providers.length > 0 ||
    filters.features.length > 0 ||
    filters.capabilities.length > 0 ||
    filters.showOnlyAvailable ||
    filters.showOnlyFavorites
  
  const sortedModels = hasActiveFilters 
    ? filteredModels.sort((a, b) => {
        // Sort by enabled status first, then alphabetically
        if (a.isEnabled !== b.isEnabled) {
          return a.isEnabled ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
    : filteredModels.sort((a, b) => {
        // Group by provider, then by model name
        if (a.provider !== b.provider) {
          const providerOrder = ["OpenAI", "Google", "OpenRouter", "Ollama"]
          return providerOrder.indexOf(a.provider) - providerOrder.indexOf(b.provider)
        }
        return a.name.localeCompare(b.name)
      })

  // Group by provider for display when no filters
  const groupedModels = hasActiveFilters
    ? null
    : sortedModels.reduce(
        (groups, modelInfo) => {
    const provider = modelInfo.provider
    if (!groups[provider]) {
      groups[provider] = []
    }
    groups[provider].push(modelInfo)
    return groups
        },
        {} as Record<string, ModelInfo[]>,
      )

  // Filter management functions
  const updateFilter = (type: keyof FilterState, value: string | boolean) => {
    setFilters((prev) => {
      if (type === "showOnlyAvailable" || type === "showOnlyFavorites") {
        return { ...prev, [type]: value as boolean }
      } else {
        const currentValues = prev[type] as string[]
        const newValues = currentValues.includes(value as string)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value as string]
        return { ...prev, [type]: newValues }
      }
    })
  }

  const clearAllFilters = () => {
    setFilters({
      providers: [],
      features: [],
      capabilities: [],
      showOnlyAvailable: false,
      showOnlyFavorites: false,
    })
  }

  const getActiveFilterCount = () => {
    return (
      filters.providers.length +
      filters.features.length +
      filters.capabilities.length +
      (filters.showOnlyAvailable ? 1 : 0) +
      (filters.showOnlyFavorites ? 1 : 0)
    )
  }

  // Group by provider for recommended models section
  const recommendedModels = sortedModels.filter(
    (info) =>
      info.hasApiKey &&
      (info.model.includes("gpt-4o") ||
      info.model.includes("gemini-2") || 
      info.model.includes("o1") ||
        info.model.includes("claude")),
  )

  const handleToggleModel = (model: AIModel) => {
    toggleModel(model)
    const isEnabled = enabledModels.includes(model)
    toast.success(isEnabled ? `${model} removed from quick access` : `${model} added to quick access`)
  }

  const handleSelectRecommended = () => {
    recommendedModels.forEach((info) => {
      if (!info.isEnabled) {
        toggleModel(info.model)
      }
    })
    toast.success("Selected recommended models")
  }

  const handleUnselectAll = () => {
    enabledModels.forEach((model) => {
      toggleModel(model)
    })
    toast.success("Unselected all models")
  }

  const handleToggleFavorite = (model: AIModel) => {
    toggleFavoriteModel(model)
    const isFavorite = favoriteModels.includes(model)
    toast.success(isFavorite ? `${model} removed from favorites` : `${model} added to favorites`)
  }

  const getDetailedModelInfo = (model: AIModel) => {
    const config = getModelConfig(model)
    const modelInfo = getModelInfo(model)
    
    let detailedDescription = ""
    let capabilities: string[] = []
    let limitations: string[] = []
    let bestUseCases: string[] = []
    
    switch (config.provider) {
      case "openai":
        if (model.includes("o3")) {
          detailedDescription = "OpenAI o3 represents the latest advancement in reasoning models. This model excels at complex problem-solving, mathematical reasoning, scientific analysis, and multi-step logical thinking."
          capabilities = [
            "Advanced mathematical reasoning",
            "Scientific problem solving", 
            "Complex logical analysis",
            "Multi-step reasoning",
            "Academic research assistance"
          ]
          limitations = [
            "Higher latency due to reasoning process",
            "More expensive per token",
            "May be overkill for simple tasks"
          ]
          bestUseCases = [
            "Academic research and analysis",
            "Complex mathematical problems",
            "Scientific hypothesis testing",
            "Technical troubleshooting"
          ]
        } else if (model.includes("o1")) {
          detailedDescription = "OpenAI o1 is designed for complex reasoning tasks that require careful thought and planning. It uses reinforcement learning to reason through problems step-by-step."
          capabilities = [
            "Step-by-step reasoning",
            "Mathematical problem solving",
            "Scientific analysis",
            "Complex coding tasks"
          ]
          limitations = [
            "Slower response times",
            "Higher cost per token",
            "Limited web search capabilities"
          ]
          bestUseCases = [
            "Academic research",
            "Complex coding problems", 
            "Mathematical proofs",
            "Scientific analysis"
          ]
        } else if (model.includes("gpt-4o")) {
          detailedDescription = "GPT-4o is OpenAI's flagship model, offering the best balance of speed, intelligence, and capabilities. It excels at natural conversations, creative tasks, and analysis."
          capabilities = [
            "Natural language understanding",
            "Image analysis and description",
            "Web search integration",
            "Code generation and debugging",
            "Creative writing and ideation"
          ]
          limitations = [
            "May hallucinate facts occasionally",
            "Limited real-time information",
            "Training data cutoff limitations"
          ]
          bestUseCases = [
            "General conversation and assistance",
            "Creative writing projects",
            "Code development and review",
            "Research and analysis"
          ]
        }
        break
        
      case "google":
        if (model.includes("2.5")) {
          detailedDescription = "Gemini 2.5 represents Google's most advanced AI model, designed for complex tasks requiring deep understanding and analysis."
          capabilities = [
            "Advanced multimodal understanding",
            "Complex reasoning and analysis",
            "Web search integration",
            "Long context understanding"
          ]
          limitations = [
            "Higher computational requirements",
            "May be slower for simple tasks",
            "Regional availability may vary"
          ]
          bestUseCases = [
            "Complex research and analysis",
            "Advanced problem solving",
            "Multi-step project planning",
            "Professional content creation"
          ]
        } else if (model.includes("flash")) {
          detailedDescription = "Gemini Flash models are optimized for speed and efficiency while maintaining high quality output. Perfect for real-time applications."
          capabilities = [
            "Ultra-fast response times",
            "Web search integration",
            "Multimodal understanding",
            "Efficient processing"
          ]
          limitations = [
            "May sacrifice some accuracy for speed",
            "Limited context for very long conversations"
          ]
          bestUseCases = [
            "Real-time chat applications",
            "Quick content generation",
            "Fast web search and summaries"
          ]
        }
        break
        
      default:
        detailedDescription = modelInfo.description
        capabilities = ["General language understanding", "Text generation", "Basic analysis"]
        limitations = ["Varies by specific model"]
        bestUseCases = ["General purpose tasks"]
    }
    
    return {
      ...modelInfo,
      detailedDescription,
      capabilities,
      limitations,
      bestUseCases
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold">Available Models</h3>
          <p className="text-sm text-muted-foreground">
            Choose which models appear in your model selector. This won't affect existing conversations.
          </p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and Controls */}
        {/* Unified Filter Toolbar */}
        <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 hover:scale-105 transition-transform">
                    <SlidersHorizontal className="h-4 w-4" />
                    Advanced Filters
                    {getActiveFilterCount() > 0 && (
                      <Badge variant="secondary" className="text-xs ml-1 bg-primary/20 text-primary">
                        {getActiveFilterCount()}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Filter Models</h4>
                      {getActiveFilterCount() > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>

                    {/* Provider Filters */}
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Providers</h5>
                      <div className="space-y-2">
                                               {filterOptions.providers.map((provider) => (
                           <div key={provider.value} className="flex items-center space-x-2">
                             <Switch
                               id={`provider-${provider.value}`}
                               checked={filters.providers.includes(provider.value)}
                              onCheckedChange={() => updateFilter("providers", provider.value)}
                               className="scale-75"
                             />
                             <label
                               htmlFor={`provider-${provider.value}`}
                               className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                             >
                               {provider.icon}
                               {provider.label}
                             </label>
                           </div>
                         ))}
                      </div>
                    </div>

                    {/* Feature Filters */}
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Features</h5>
                      <div className="space-y-2">
                                               {filterOptions.features.map((feature) => (
                           <div key={feature.value} className="flex items-center space-x-2">
                             <Switch
                               id={`feature-${feature.value}`}
                               checked={filters.features.includes(feature.value)}
                              onCheckedChange={() => updateFilter("features", feature.value)}
                               className="scale-75"
                             />
                             <label
                               htmlFor={`feature-${feature.value}`}
                               className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                             >
                               <span className={feature.color}>{feature.icon}</span>
                               {feature.label}
                             </label>
                           </div>
                         ))}
                      </div>
                    </div>

                    {/* Capability Filters */}
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Capabilities</h5>
                      <div className="space-y-2">
                                               {filterOptions.capabilities.map((capability) => (
                           <div key={capability.value} className="flex items-center space-x-2">
                             <Switch
                               id={`capability-${capability.value}`}
                               checked={filters.capabilities.includes(capability.value)}
                              onCheckedChange={() => updateFilter("capabilities", capability.value)}
                               className="scale-75"
                             />
                             <label
                               htmlFor={`capability-${capability.value}`}
                               className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                             >
                               {capability.label}
                             </label>
                           </div>
                         ))}
                      </div>
                    </div>

                    {/* Show Only Available */}
                    <div className="pt-2 border-t">
                                           <div className="flex items-center space-x-2">
                         <Switch
                           id="show-only-available"
                           checked={filters.showOnlyAvailable}
                          onCheckedChange={() => updateFilter("showOnlyAvailable", !filters.showOnlyAvailable)}
                           className="scale-75"
                         />
                         <label
                           htmlFor="show-only-available"
                           className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                         >
                           Show only available models
                         </label>
                       </div>
                    </div>

                    {/* Show Only Favorites */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-only-favorites"
                          checked={filters.showOnlyFavorites}
                          onCheckedChange={() => updateFilter("showOnlyFavorites", !filters.showOnlyFavorites)}
                          className="scale-75"
                        />
                        <label
                          htmlFor="show-only-favorites"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Show only favorite models
                        </label>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Quick Actions with better spacing */}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectRecommended}
                  className="gap-2 hover:scale-105 transition-transform"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select Recommended
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnselectAll}
                  className="gap-2 hover:scale-105 transition-transform"
                >
                  <Square className="h-4 w-4" />
                  Unselect All
                </Button>
              </div>
            </div>

            {/* Active Filters Display with better styling */}
            {getActiveFilterCount() > 0 && (
              <div className="flex items-center gap-2 flex-wrap bg-background/50 rounded-md p-2 border">
                <span className="text-xs text-muted-foreground font-medium">Active:</span>
                {filters.providers.map((provider) => (
                  <Badge key={provider} variant="secondary" className="text-xs gap-1">
                    {filterOptions.providers.find((p) => p.value === provider)?.label}
                    <button
                      onClick={() => updateFilter("providers", provider)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
                {filters.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs gap-1">
                    {filterOptions.features.find((f) => f.value === feature)?.label}
                    <button
                      onClick={() => updateFilter("features", feature)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
                {filters.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-xs gap-1">
                    {filterOptions.capabilities.find((c) => c.value === capability)?.label}
                    <button
                      onClick={() => updateFilter("capabilities", capability)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
                {filters.showOnlyAvailable && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Available only
                    <button
                      onClick={() => updateFilter("showOnlyAvailable", false)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                )}
                {filters.showOnlyFavorites && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Favorites only
                    <button
                      onClick={() => updateFilter("showOnlyFavorites", false)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Models List - Grouped by Provider or Filtered */}
      <div className="space-y-6">
        {!hasActiveFilters && groupedModels ? (
          // Grouped by provider when no filters
          Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider} className="space-y-4">
              <div
                className={cn(
                "flex items-center gap-3 p-4 rounded-lg transition-all duration-200",
                  models.some((m) => m.isEnabled) && "bg-primary/5 border border-primary/20",
                )}
              >
                <ProviderLogo 
                  provider={provider.toLowerCase() as "openai" | "google" | "openrouter" | "ollama"} 
                  size="md" 
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold">{provider}</h4>
                    {models.some((m) => m.isEnabled) && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                        {models.filter((m) => m.isEnabled).length} active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {models.length} model{models.length !== 1 ? "s" : ""} available • Last updated: January 2025
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="opacity-60 hover:opacity-100">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4">
                {models.map((modelInfo) => (
                  <div
                    key={modelInfo.model}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-6 transition-all duration-300",
                      modelInfo.isEnabled && "ring-2 ring-primary/20 bg-primary/5",
                      "hover:shadow-lg hover:border-primary/20",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Model Icon */}
                        {/* Model Info */}
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <ProviderLogo
                                provider={
                                  modelInfo.provider.toLowerCase() as "openai" | "google" | "openrouter" | "ollama"
                                }
                                size="md"
                              />
                              <h4 className="text-xl font-bold text-foreground truncate">{modelInfo.name}</h4>
                              {favoriteModels.includes(modelInfo.model) && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                >
                                  <Star className="h-3 w-3 fill-current" />
                                  Favorite
                                </Badge>
                              )}
                              {modelInfo.name.includes("🔺") && (
                                <Badge variant="secondary" className="text-xs">
                                  Delta
                                </Badge>
                              )}
                            </div>
                            <div className="ml-12 space-y-2">
                              <p className="text-sm text-muted-foreground leading-relaxed">{modelInfo.description}</p>
                              <button 
                                onClick={() => setSelectedDetailModel(modelInfo.model)}
                                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                              >
                                Show more details →
                              </button>
                            </div>
                          </div>
                          
                          {/* Features */}
                          <div className="flex items-center gap-3 flex-wrap ml-12">
                            {/* Core Features */}
                            <div className="flex items-center gap-1">
                              {modelInfo.features
                                .filter((f) => ["Search", "Vision", "PDFs"].includes(f.label))
                                .map((feature, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className={cn("text-xs gap-1 font-medium", feature.color)}
                                >
                                  {feature.icon}
                                  {feature.label}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Performance Features */}
                            <div className="flex items-center gap-1">
                              {modelInfo.features
                                .filter((f) => ["Fast", "Thinking", "Reasoning"].includes(f.label))
                                .map((feature, index) => (
                                  <Badge key={index} variant="outline" className={cn("text-xs gap-1", feature.color)}>
                                  {feature.icon}
                                  {feature.label}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Status Indicators */}
                            {modelInfo.isUsingDefaultKey && (
                              <Badge
                                variant="outline"
                                className="text-xs gap-1 border-green-500/30 text-green-600 bg-green-50/50 dark:bg-green-950/10 opacity-75"
                              >
                                <Shield className="h-3 w-3" />
                                Default key
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        {modelInfo.searchUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <a href={modelInfo.searchUrl} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4" />
                              Search URL
                            </a>
                          </Button>
                        )}

                        {/* Favorite Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(modelInfo.model)}
                          className={cn(
                            "gap-2 transition-all duration-200",
                            favoriteModels.includes(modelInfo.model)
                              ? "text-yellow-500 hover:text-yellow-600"
                              : "text-muted-foreground hover:text-yellow-500",
                          )}
                          aria-label={
                            favoriteModels.includes(modelInfo.model) ? "Remove from favorites" : "Add to favorites"
                          }
                        >
                          <Star
                            className={cn(
                              "h-4 w-4 transition-all duration-200",
                              favoriteModels.includes(modelInfo.model) && "fill-current",
                            )}
                          />
                        </Button>
                        
                        <Switch
                          checked={modelInfo.isEnabled}
                          onCheckedChange={() => handleToggleModel(modelInfo.model)}
                          disabled={!modelInfo.hasApiKey}
                        />
                      </div>
                    </div>
                    
                    {/* API Key Required Overlay */}
                    {!modelInfo.hasApiKey && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Key className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-sm font-medium">API Key Required</p>
                          <p className="text-xs text-muted-foreground">
                            Add your {modelInfo.provider} API key in the API Keys tab
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          // Filtered view - flat list
          <div className="space-y-4">
            {sortedModels.map((modelInfo) => (
              <div
                key={modelInfo.model}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-6 transition-all duration-300",
                  modelInfo.isEnabled && "ring-2 ring-primary/20 bg-primary/5",
                  "hover:shadow-lg hover:border-primary/20",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Model Icon */}
                    {/* Model Info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <ProviderLogo
                            provider={modelInfo.provider.toLowerCase() as "openai" | "google" | "openrouter" | "ollama"}
                            size="md"
                          />
                          <h4 className="text-xl font-bold text-foreground truncate">{modelInfo.name}</h4>
                          {favoriteModels.includes(modelInfo.model) && (
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                            >
                              <Star className="h-3 w-3 fill-current" />
                              Favorite
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {modelInfo.provider}
                          </Badge>
                          {modelInfo.name.includes("🔺") && (
                            <Badge variant="secondary" className="text-xs">
                              Delta
                            </Badge>
                          )}
                        </div>
                        <div className="ml-12 space-y-2">
                          <p className="text-sm text-muted-foreground leading-relaxed">{modelInfo.description}</p>
                          <button 
                            onClick={() => setSelectedDetailModel(modelInfo.model)}
                            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            Show more details →
                          </button>
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div className="flex items-center gap-3 flex-wrap ml-12">
                        {/* Core Features */}
                        <div className="flex items-center gap-1">
                          {modelInfo.features
                            .filter((f) => ["Search", "Vision", "PDFs"].includes(f.label))
                            .map((feature, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className={cn("text-xs gap-1 font-medium", feature.color)}
                            >
                              {feature.icon}
                              {feature.label}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Performance Features */}
                        <div className="flex items-center gap-1">
                          {modelInfo.features
                            .filter((f) => ["Fast", "Thinking", "Reasoning"].includes(f.label))
                            .map((feature, index) => (
                              <Badge key={index} variant="outline" className={cn("text-xs gap-1", feature.color)}>
                              {feature.icon}
                              {feature.label}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Status Indicators */}
                        {modelInfo.isUsingDefaultKey && (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 border-green-500/30 text-green-600 bg-green-50/50 dark:bg-green-950/10 opacity-75"
                          >
                            <Shield className="h-3 w-3" />
                            Default key
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {modelInfo.searchUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <a href={modelInfo.searchUrl} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                          Search URL
                        </a>
                      </Button>
                    )}

                    {/* Favorite Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(modelInfo.model)}
                      className={cn(
                        "gap-2 transition-all duration-200",
                        favoriteModels.includes(modelInfo.model)
                          ? "text-yellow-500 hover:text-yellow-600"
                          : "text-muted-foreground hover:text-yellow-500",
                      )}
                      aria-label={
                        favoriteModels.includes(modelInfo.model) ? "Remove from favorites" : "Add to favorites"
                      }
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-all duration-200",
                          favoriteModels.includes(modelInfo.model) && "fill-current",
                        )}
                      />
                    </Button>
                    
                    <Switch
                      checked={modelInfo.isEnabled}
                      onCheckedChange={() => handleToggleModel(modelInfo.model)}
                      disabled={!modelInfo.hasApiKey}
                    />
                  </div>
                </div>
                
                {/* API Key Required Overlay */}
                {!modelInfo.hasApiKey && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Key className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">API Key Required</p>
                      <p className="text-xs text-muted-foreground">
                        Add your {modelInfo.provider} API key in the API Keys tab
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {sortedModels.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No models found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters to find more models</p>
        </div>
      )}

      {/* Model Details Dialog */}
      <Dialog open={selectedDetailModel !== null} onOpenChange={() => setSelectedDetailModel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedDetailModel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <ProviderLogo
                    provider={getDetailedModelInfo(selectedDetailModel).provider.toLowerCase() as "openai" | "google" | "openrouter" | "ollama"}
                    size="md"
                  />
                  {getDetailedModelInfo(selectedDetailModel).name}
                  <Badge variant="outline" className="text-xs">
                    {getDetailedModelInfo(selectedDetailModel).provider}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="font-semibold mb-2">About this model</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getDetailedModelInfo(selectedDetailModel).detailedDescription}
                  </p>
                </div>

                {/* Features */}
                <div>
                  <h4 className="font-semibold mb-3">Features & Capabilities</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getDetailedModelInfo(selectedDetailModel).features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className={cn("text-xs gap-1 font-medium", feature.color)}
                      >
                        {feature.icon}
                        {feature.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <h4 className="font-semibold mb-3">Key Capabilities</h4>
                  <ul className="space-y-1">
                    {getDetailedModelInfo(selectedDetailModel).capabilities.map((capability, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best Use Cases */}
                <div>
                  <h4 className="font-semibold mb-3">Best Use Cases</h4>
                  <ul className="space-y-1">
                    {getDetailedModelInfo(selectedDetailModel).bestUseCases.map((useCase, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limitations */}
                <div>
                  <h4 className="font-semibold mb-3">Limitations</h4>
                  <ul className="space-y-1">
                    {getDetailedModelInfo(selectedDetailModel).limitations.map((limitation, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Model Status */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Status: {getDetailedModelInfo(selectedDetailModel).hasApiKey ? "Available" : "Requires API Key"}
                      </p>
                      {getDetailedModelInfo(selectedDetailModel).isUsingDefaultKey && (
                        <p className="text-xs text-muted-foreground">Using default API key</p>
                      )}
                    </div>
                    <Switch
                      checked={getDetailedModelInfo(selectedDetailModel).isEnabled}
                      onCheckedChange={() => handleToggleModel(selectedDetailModel)}
                      disabled={!getDetailedModelInfo(selectedDetailModel).hasApiKey}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
