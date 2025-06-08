"use client"

import { useState, useEffect } from "react"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { useOllamaStore } from "@/frontend/stores/OllamaStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Badge } from "@/frontend/components/ui/badge"
import { Loader2, CheckCircle, XCircle, RefreshCw, Trash } from "lucide-react"
import { toast } from "sonner"

export function OllamaSettings() {
  const { baseUrl, setBaseUrl, isConnected, availableModels, testConnection } = useOllamaStore()
  const { addCustomModel, removeCustomModel, customModels, selectedModel, setModel } = useModelStore()

  const [url, setUrl] = useState(baseUrl)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setUrl(baseUrl)
  }, [baseUrl])

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      setBaseUrl(url)
      const success = await testConnection()

      if (success) {
        toast.success("Successfully connected to Ollama")
      } else {
        toast.error("Failed to connect to Ollama")
      }
    } catch (error) {
      console.error("Error connecting to Ollama:", error)
      toast.error("Error connecting to Ollama")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const success = await testConnection()

      if (success) {
        toast.success("Successfully refreshed Ollama models")
      } else {
        toast.error("Failed to refresh Ollama models")
      }
    } catch (error) {
      console.error("Error refreshing Ollama models:", error)
      toast.error("Error refreshing Ollama models")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddModel = (modelName: string) => {
    const ollamaModel = `ollama:${modelName}` as const
    addCustomModel(ollamaModel)
    toast.success(`Added ${modelName} to available models`)
  }

  const handleRemoveModel = (modelName: string) => {
    const ollamaModel = `ollama:${modelName}` as const
    removeCustomModel(ollamaModel)
    toast.success(`Removed ${modelName} from available models`)
  }

  const handleSelectModel = (modelName: string) => {
    const ollamaModel = `ollama:${modelName}` as const
    setModel(ollamaModel)
    toast.success(`Selected ${modelName}`)
  }

  const isModelAdded = (modelName: string) => {
    return customModels.includes(`ollama:${modelName}` as const)
  }

  const isModelSelected = (modelName: string) => {
    return selectedModel === `ollama:${modelName}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ollama Integration</CardTitle>
        <CardDescription>Connect to your local Ollama instance to use your own models</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Ollama URL (e.g., http://localhost:11434)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Connect
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <span>Status:</span>
          {isConnected ? (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
            >
              <CheckCircle className="h-3 w-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            >
              <XCircle className="h-3 w-3 mr-1" /> Disconnected
            </Badge>
          )}

          {isConnected && (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Refresh Models
            </Button>
          )}
        </div>

        {isConnected && availableModels.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Available Models</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableModels.map((model) => (
                <div key={model} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="font-mono text-sm truncate">{model}</span>
                  <div className="flex space-x-1">
                    {isModelAdded(model) ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveModel(model)} className="h-7 px-2">
                          <Trash className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                        {!isModelSelected(model) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectModel(model)}
                            className="h-7 px-2"
                          >
                            Select
                          </Button>
                        )}
                        {isModelSelected(model) && (
                          <Badge variant="secondary" className="h-7 px-2">
                            Selected
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleAddModel(model)} className="h-7 px-2">
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>
          Ollama must be running locally with the models you want to use.{" "}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            Learn more about Ollama
          </a>
        </p>
      </CardFooter>
    </Card>
  )
}
