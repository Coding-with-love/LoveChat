"use client"

import { memo, useCallback, useMemo, useState, useEffect } from "react"
import { Button } from "@/frontend/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/frontend/components/ui/dropdown-menu"
import { useNavigate } from "react-router"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { type AIModel, getModelConfig } from "@/lib/models"
import { ChevronDown, Search, Settings, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProviderLogo } from "@/frontend/components/ProviderLogo"

const PureChatModelDropdown = () => {
  const getKey = useAPIKeyStore((state) => state.getKey)
  const { selectedModel, setModel, getEnabledModels, ensureValidSelectedModel, favoriteModels, toggleFavoriteModel } =
    useModelStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")

  // Ensure valid model selection on mount
  useEffect(() => {
    // Only ensure valid model if not currently loading API keys
    const apiKeyStore = useAPIKeyStore.getState()
    if (!apiKeyStore.isLoading) {
      ensureValidSelectedModel()
    }
  }, [ensureValidSelectedModel])

  // Get only enabled models that have API keys
  const availableModels = useMemo(() => {
    return getEnabledModels()
  }, [getEnabledModels])

  const getModelIcon = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    return <ProviderLogo provider={modelConfig.provider} size="sm" />
  }, [])

  const getModelBadges = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    const badges = []

    if (modelConfig.supportsSearch) {
      badges.push(
        <div key="search" className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
          <Search className="w-2.5 h-2.5 text-primary" />
        </div>,
      )
    }

    if (modelConfig.supportsThinking) {
      badges.push(
        <div key="thinking" className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-pink-500" />
        </div>,
      )
    }

    return badges
  }, [])

  const getProviderName = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    switch (modelConfig.provider) {
      case "openai":
        return "OpenAI"
      case "google":
        return "Google"
      case "openrouter":
        return "OpenRouter"
      case "ollama":
        return "Ollama"
      default:
        return ""
    }
  }, [])

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!searchQuery) return availableModels
    return availableModels.filter(
      (model) =>
        model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getProviderName(model).toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [availableModels, searchQuery, getProviderName])

  const filteredFavorites = useMemo(() => {
    if (!searchQuery) return favoriteModels.filter((model) => availableModels.includes(model))
    return favoriteModels.filter(
      (model) =>
        availableModels.includes(model) &&
        (model.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getProviderName(model).toLowerCase().includes(searchQuery.toLowerCase())),
    )
  }, [favoriteModels, searchQuery, getProviderName, availableModels])

  const otherModels = useMemo(() => {
    return filteredModels.filter((model) => !favoriteModels.includes(model))
  }, [filteredModels, favoriteModels])

  if (availableModels.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-8 px-3 text-sm rounded-md text-muted-foreground"
          disabled
        >
          <span className="font-medium">No models available</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-9 px-3 text-sm rounded-md text-foreground hover:bg-primary/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary transition-all duration-200"
            aria-label={`Selected model: ${selectedModel}`}
          >
            <div className="flex items-center gap-2">
              {getModelIcon(selectedModel)}
              <span className="font-medium max-w-[120px] truncate">{selectedModel.replace("ollama:", "")}</span>
              <div className="flex items-center gap-1">{getModelBadges(selectedModel)}</div>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[480px] max-h-[600px] overflow-hidden p-0" align="start">
          <div className="bg-background border-0">
            {/* Search Header */}
            <div className="p-4 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                />
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {/* Favorites Section */}
              {filteredFavorites.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Favorites</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredFavorites.map((model) => (
                      <div
                        key={model}
                        onClick={() => setModel(model)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/50",
                          selectedModel === model
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border/50 hover:border-border",
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getModelIcon(model)}
                            {selectedModel === model && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="flex items-center gap-1">{getModelBadges(model)}</div>
                        </div>
                        <div className="text-sm font-medium text-foreground mb-1">
                          {model.replace("ollama:", "").split(" ").slice(0, 2).join(" ")}
                        </div>
                        <div className="text-xs text-muted-foreground">{getProviderName(model)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Sections */}
              {(["openai", "google", "openrouter", "ollama"] as const).map((provider) => {
                const providerModels = otherModels.filter((model) => getModelConfig(model).provider === provider)
                if (providerModels.length === 0) return null

                return (
                  <div key={provider} className="p-4 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <ProviderLogo provider={provider} size="sm" />
                      <span className="text-sm font-medium">{getProviderName(providerModels[0])}</span>
                    </div>
                    <div className="space-y-1">
                      {providerModels.map((model) => (
                        <div
                          key={model}
                          onClick={() => setModel(model)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50",
                            selectedModel === model ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/30",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {getModelIcon(model)}
                            <div>
                              <div className="text-sm font-medium text-foreground">{model.replace("ollama:", "")}</div>
                            </div>
                            {selectedModel === model && <div className="w-2 h-2 rounded-full bg-primary ml-2" />}
                          </div>
                          <div className="flex items-center gap-1">{getModelBadges(model)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* No Results */}
              {filteredModels.length === 0 && (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No models found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
                </div>
              )}

              {/* Settings Link */}
              <div className="p-4 border-t border-border/50">
                <button
                  onClick={() => navigate("/settings?tab=models")}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <Settings className="w-4 h-4" />
                  <span>Manage models in Settings</span>
                </button>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const ChatModelDropdown = memo(PureChatModelDropdown)
