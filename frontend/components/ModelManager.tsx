"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Input } from "./ui/input"
// import { Checkbox } from "./ui/checkbox"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { AI_MODELS, getModelConfig, type AIModel } from "@/lib/models"
import { ProviderLogo } from "./ProviderLogo"
import { 
  Bot, 
  Key, 
  Globe, 
  Zap, 
  Brain, 
  Search, 
  Sparkles, 
  Eye, 
  FileText, 
  Lightbulb,
  Filter,
  CheckSquare,
  Square,
  SlidersHorizontal,
  X,
  Shield
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"

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
}

export function ModelManager() {
  const { getKey } = useAPIKeyStore()
  const { selectedModel, setModel, enabledModels, toggleModel, customModels } = useModelStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<FilterState>({
    providers: [],
    features: [],
    capabilities: [],
    showOnlyAvailable: false
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
    ]
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
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20"
      })
    }
    
    if (config.supportsThinking) {
      features.push({
        icon: <Sparkles className="h-3 w-3" />,
        label: "Thinking",
        color: "bg-purple-500/10 text-purple-600 border-purple-500/20"
      })
    }

    // Add Vision for specific models
    if (model.includes("gpt-4") || model.includes("gemini") || model.includes("claude")) {
      features.push({
        icon: <Eye className="h-3 w-3" />,
        label: "Vision",
        color: "bg-green-500/10 text-green-600 border-green-500/20"
      })
    }

    // Add PDFs for certain models
    if (model.includes("gemini") || model.includes("claude")) {
      features.push({
        icon: <FileText className="h-3 w-3" />,
        label: "PDFs",
        color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
      })
    }

    // Add Fast badge for specific models
    if (model.includes("flash") || model.includes("lite") || model.includes("mini")) {
      features.push({
        icon: <Zap className="h-3 w-3" />,
        label: "Fast",
        color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      })
    }

    // Add Reasoning for o1/o3 models
    if (model.includes("o1") || model.includes("o3") || model.includes("reasoning")) {
      features.push({
        icon: <Lightbulb className="h-3 w-3" />,
        label: "Reasoning",
        color: "bg-orange-500/10 text-orange-600 border-orange-500/20"
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
      searchUrl
    }
  }

  // Check if model matches filters
  const modelMatchesFilters = (modelInfo: ModelInfo): boolean => {
    // Provider filter
    if (filters.providers.length > 0) {
      const providerMatch = filters.providers.some(provider => 
        modelInfo.provider.toLowerCase() === provider
      )
      if (!providerMatch) return false
    }

    // Features filter
    if (filters.features.length > 0) {
      const modelFeatures = modelInfo.features.map(f => f.label.toLowerCase())
      const featureMatch = filters.features.some(feature => {
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
      const capabilityMatch = filters.capabilities.some(capability => {
        switch (capability) {
          case "latest":
            return modelInfo.model.includes("2.5") || modelInfo.model.includes("o3") || modelInfo.model.includes("2.0")
          case "flagship":
            return modelInfo.model.includes("gpt-4o") || modelInfo.model.includes("gemini-2.5-pro") || modelInfo.model.includes("claude-3-5-sonnet")
          case "experimental":
            return modelInfo.model.includes("exp") || modelInfo.model.includes("preview") || modelInfo.model.includes("thinking")
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

    return true
  }

  // Get all available models
  const allModels = [...AI_MODELS, ...customModels]
  
  // Filter and search models
  const filteredModels = allModels
    .map(getModelInfo)
    .filter(modelInfo => {
      const matchesSearch = modelInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           modelInfo.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           modelInfo.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSearch && modelMatchesFilters(modelInfo)
    })

  // Sort models - by provider when no filters, by relevance when filtered
  const hasActiveFilters = filters.providers.length > 0 || filters.features.length > 0 || filters.capabilities.length > 0 || filters.showOnlyAvailable
  
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
  const groupedModels = hasActiveFilters ? null : sortedModels.reduce((groups, modelInfo) => {
    const provider = modelInfo.provider
    if (!groups[provider]) {
      groups[provider] = []
    }
    groups[provider].push(modelInfo)
    return groups
  }, {} as Record<string, ModelInfo[]>)

  // Filter management functions
  const updateFilter = (type: keyof FilterState, value: string | boolean) => {
    setFilters(prev => {
      if (type === 'showOnlyAvailable') {
        return { ...prev, [type]: value as boolean }
      } else {
        const currentValues = prev[type] as string[]
        const newValues = currentValues.includes(value as string)
          ? currentValues.filter(v => v !== value)
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
      showOnlyAvailable: false
    })
  }

  const getActiveFilterCount = () => {
    return filters.providers.length + filters.features.length + filters.capabilities.length + (filters.showOnlyAvailable ? 1 : 0)
  }

  // Group by provider for recommended models section
  const recommendedModels = sortedModels.filter(info => 
    info.hasApiKey && (
      info.model.includes("gpt-4o") || 
      info.model.includes("gemini-2") || 
      info.model.includes("o1") ||
      info.model.includes("claude")
    )
  )

  const handleToggleModel = (model: AIModel) => {
    toggleModel(model)
    const isEnabled = enabledModels.includes(model)
    toast.success(
      isEnabled ? `${model} removed from quick access` : `${model} added to quick access`
    )
  }

  const handleSelectRecommended = () => {
    recommendedModels.forEach(info => {
      if (!info.isEnabled) {
        toggleModel(info.model)
      }
    })
    toast.success("Selected recommended models")
  }

  const handleUnselectAll = () => {
    enabledModels.forEach(model => {
      toggleModel(model)
    })
    toast.success("Unselected all models")
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
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {getActiveFilterCount() > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
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
                             onCheckedChange={() => updateFilter('providers', provider.value)}
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
                             onCheckedChange={() => updateFilter('features', feature.value)}
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
                             onCheckedChange={() => updateFilter('capabilities', capability.value)}
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
                         onCheckedChange={() => updateFilter('showOnlyAvailable', !filters.showOnlyAvailable)}
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
                </div>
              </PopoverContent>
            </Popover>

            {/* Quick Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectRecommended}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Select Recommended
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnselectAll}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Unselect All
            </Button>
          </div>

          {/* Active Filters Display */}
          {getActiveFilterCount() > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {filters.providers.map(provider => (
                <Badge
                  key={provider}
                  variant="secondary"
                  className="text-xs gap-1"
                >
                  {filterOptions.providers.find(p => p.value === provider)?.label}
                  <button
                    onClick={() => updateFilter('providers', provider)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
              {filters.features.map(feature => (
                <Badge
                  key={feature}
                  variant="secondary"
                  className="text-xs gap-1"
                >
                  {filterOptions.features.find(f => f.value === feature)?.label}
                  <button
                    onClick={() => updateFilter('features', feature)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
              {filters.capabilities.map(capability => (
                <Badge
                  key={capability}
                  variant="secondary"
                  className="text-xs gap-1"
                >
                  {filterOptions.capabilities.find(c => c.value === capability)?.label}
                  <button
                    onClick={() => updateFilter('capabilities', capability)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
              {filters.showOnlyAvailable && (
                <Badge
                  variant="secondary"
                  className="text-xs gap-1"
                >
                  Available only
                  <button
                    onClick={() => updateFilter('showOnlyAvailable', false)}
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

      {/* Models List - Grouped by Provider or Filtered */}
      <div className="space-y-6">
        {!hasActiveFilters && groupedModels ? (
          // Grouped by provider when no filters
          Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider} className="space-y-4">
              <div className="flex items-center gap-3">
                <ProviderLogo 
                  provider={provider.toLowerCase() as "openai" | "google" | "openrouter" | "ollama"} 
                  size="md" 
                />
                <div>
                  <h4 className="text-lg font-semibold">{provider}</h4>
                  <p className="text-sm text-muted-foreground">
                    {models.length} model{models.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                {models.map((modelInfo) => (
                  <div
                    key={modelInfo.model}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-6 transition-all duration-300",
                      modelInfo.isEnabled && "ring-2 ring-primary/20 bg-primary/5",
                      "hover:shadow-lg hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Model Icon */}
                        {modelInfo.icon}
                        
                        {/* Model Info */}
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-semibold text-foreground truncate">
                                {modelInfo.name}
                              </h4>
                              {modelInfo.name.includes("🔺") && (
                                <Badge variant="secondary" className="text-xs">
                                  Delta
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {modelInfo.description}
                            </p>
                            <button className="text-xs text-primary hover:text-primary/80 transition-colors">
                              Show more
                            </button>
                          </div>
                          
                          {/* Features */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {modelInfo.features.map((feature, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className={cn("text-xs gap-1", feature.color)}
                              >
                                {feature.icon}
                                {feature.label}
                              </Badge>
                            ))}
                            {modelInfo.isUsingDefaultKey && (
                              <Badge
                                variant="outline"
                                className="text-xs gap-1 border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/20"
                              >
                                <Shield className="h-3 w-3" />
                                Using default key
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
                  "hover:shadow-lg hover:border-primary/20"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Model Icon */}
                    {modelInfo.icon}
                    
                    {/* Model Info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-foreground truncate">
                            {modelInfo.name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {modelInfo.provider}
                          </Badge>
                          {modelInfo.name.includes("🔺") && (
                            <Badge variant="secondary" className="text-xs">
                              Delta
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {modelInfo.description}
                        </p>
                        <button className="text-xs text-primary hover:text-primary/80 transition-colors">
                          Show more
                        </button>
                      </div>
                      
                      {/* Features */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {modelInfo.features.map((feature, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className={cn("text-xs gap-1", feature.color)}
                          >
                            {feature.icon}
                            {feature.label}
                          </Badge>
                        ))}
                        {modelInfo.isUsingDefaultKey && (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/20"
                          >
                            <Shield className="h-3 w-3" />
                            Using default key
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
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters to find more models
          </p>
        </div>
      )}
    </div>
  )
}

