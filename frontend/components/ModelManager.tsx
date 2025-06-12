"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Separator } from "./ui/separator"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { AI_MODELS, getModelConfig, type AIModel } from "@/lib/models"
import { Bot, Key, Globe, Zap, Brain, Plus, Minus, Check, X, Search, Sparkles } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ModelGroup {
  provider: string
  name: string
  icon: React.ReactNode
  color: string
  models: AIModel[]
  hasApiKey: boolean
}

export function ModelManager() {
  const { getKey } = useAPIKeyStore()
  const { selectedModel, setModel, enabledModels, toggleModel, customModels } = useModelStore()
  const [searchQuery, setSearchQuery] = useState("")

  // Group models by provider
  const modelGroups: ModelGroup[] = [
    {
      provider: "openai",
      name: "OpenAI",
      icon: <Zap className="h-4 w-4" />,
      color: "from-green-500/10 to-emerald-500/10 border-green-500/20",
      models: AI_MODELS.filter(model => getModelConfig(model).provider === "openai"),
      hasApiKey: !!getKey("openai")
    },
    {
      provider: "google",
      name: "Google",
      icon: <Brain className="h-4 w-4" />,
      color: "from-blue-500/10 to-cyan-500/10 border-blue-500/20",
      models: AI_MODELS.filter(model => getModelConfig(model).provider === "google"),
      hasApiKey: !!getKey("google")
    },
    {
      provider: "openrouter",
      name: "OpenRouter",
      icon: <Globe className="h-4 w-4" />,
      color: "from-purple-500/10 to-pink-500/10 border-purple-500/20",
      models: AI_MODELS.filter(model => getModelConfig(model).provider === "openrouter"),
      hasApiKey: !!getKey("openrouter")
    },
    {
      provider: "ollama",
      name: "Ollama",
      icon: <Bot className="h-4 w-4" />,
      color: "from-orange-500/10 to-red-500/10 border-orange-500/20",
      models: customModels,
      hasApiKey: true // Ollama doesn't need API keys
    }
  ]

  const filteredGroups = modelGroups.map(group => ({
    ...group,
    models: group.models.filter(model => 
      model.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.models.length > 0)

  const handleToggleModel = (model: AIModel) => {
    toggleModel(model)
    const isEnabled = enabledModels.includes(model)
    toast.success(
      isEnabled ? `${model} removed from quick access` : `${model} added to quick access`
    )
  }

  const getModelBadges = (model: AIModel) => {
    const config = getModelConfig(model)
    const badges = []
    
    if (config.supportsSearch) {
      badges.push(
        <Badge key="search" variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Search className="h-3 w-3 mr-1" />
          Search
        </Badge>
      )
    }
    
    if (config.supportsThinking) {
      badges.push(
        <Badge key="thinking" variant="secondary" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
          <Sparkles className="h-3 w-3 mr-1" />
          Thinking
        </Badge>
      )
    }
    
    return badges
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Model Management</h3>
          <p className="text-sm text-muted-foreground">
            Choose which models appear in your quick access menu. Only models with valid API keys can be enabled.
          </p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
        </div>
      </div>

      {/* Model Groups */}
      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <Card key={group.provider} className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-gradient-to-br", group.color)}>
                    {group.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {group.models.length} model{group.models.length !== 1 ? 's' : ''} available
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {group.hasApiKey ? (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                      <Key className="h-3 w-3 mr-1" />
                      API Key Required
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!group.hasApiKey ? (
                <div className="text-center py-6">
                  <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Add your {group.name} API key in the API Keys tab to enable these models
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {group.models.map((model) => {
                    const isEnabled = enabledModels.includes(model)
                    const isSelected = selectedModel === model
                    
                    return (
                      <div
                        key={model}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                          isSelected && "bg-primary/5 border-primary/20",
                          !isSelected && "bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn(
                              "font-medium text-sm truncate",
                              isSelected && "text-primary"
                            )}>
                              {model.replace("ollama:", "")}
                            </h4>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getModelBadges(model)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!isSelected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setModel(model)}
                              className="text-xs"
                            >
                              Select
                            </Button>
                          )}
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleToggleModel(model)}
                            disabled={!group.hasApiKey}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No models found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or add API keys to enable more models
          </p>
        </div>
      )}
    </div>
  )
}
