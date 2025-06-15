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
import { Switch } from "@/frontend/components/ui/switch"

export function OllamaSettings() {
  const { baseUrl, setBaseUrl, isConnected, availableModels, testConnection, useDirectConnection, setUseDirectConnection } = useOllamaStore()
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
        <div className="space-y-3">
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
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div className="space-y-1">
              <div className="text-sm font-medium">Direct Browser Connection</div>
              <div className="text-xs text-muted-foreground">
                ⚠️ Blocked by browser CORS policy from HTTPS sites. Use server proxy instead.
              </div>
            </div>
            <Switch 
              checked={useDirectConnection} 
              onCheckedChange={setUseDirectConnection}
              disabled={true}
            />
          </div>
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
      <CardFooter className="text-xs text-muted-foreground space-y-3">
        <div className="border-t pt-3">
          <h4 className="font-semibold text-sm mb-2 text-foreground">📖 Complete Setup Guide</h4>
        </div>
        
        <div>
          <p className="font-medium text-foreground mb-1">1. Install & Setup Ollama</p>
          <p>Download Ollama from{" "}
            <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
              ollama.com
            </a>, then:</p>
          <div className="mt-1 space-y-1">
            <code className="block bg-muted px-2 py-1 rounded text-xs">ollama pull gemma2</code>
            <code className="block bg-muted px-2 py-1 rounded text-xs">ollama serve</code>
          </div>
          <p className="mt-1">Ollama will run on <code className="bg-muted px-1 rounded">http://localhost:11434</code></p>
        </div>

        <div>
          <p className="font-medium text-foreground mb-1">2. Setup ngrok (for Production Access)</p>
          <p>Sign up at{" "}
            <a href="https://dashboard.ngrok.com/signup" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
              ngrok.com
            </a>{" "}and get your auth token from{" "}
            <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
              your dashboard
            </a>:</p>
          <div className="mt-1 space-y-1">
            <code className="block bg-muted px-2 py-1 rounded text-xs">brew install ngrok</code>
            <code className="block bg-muted px-2 py-1 rounded text-xs">ngrok config add-authtoken YOUR_TOKEN</code>
            <code className="block bg-muted px-2 py-1 rounded text-xs">ngrok http 11434 --host-header=localhost</code>
          </div>
        </div>

        <div>
          <p className="font-medium text-foreground mb-1">3. Configure This App</p>
          <p>Copy the ngrok HTTPS URL (e.g., <code className="bg-muted px-1 rounded">https://abc123.ngrok.app</code>) into the URL field above and click "Connect".</p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
          <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">🔒 Security Note</p>
          <p className="text-yellow-700 dark:text-yellow-300">Your ngrok URL is public! Consider adding authentication:</p>
          <code className="block bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded text-xs mt-1 text-yellow-800 dark:text-yellow-200">
            ngrok http 11434 --basic-auth "user:password" --host-header=localhost
          </code>
        </div>

        <div>
          <p className="font-medium text-foreground mb-1">📋 Usage Modes</p>
          <div className="space-y-1">
            <p><strong>Local Development:</strong> Use <code className="bg-muted px-1 rounded">http://localhost:11434</code></p>
            <p><strong>Production/Remote:</strong> Use your ngrok HTTPS URL</p>
            <p><strong>Team Sharing:</strong> Share your ngrok URL with team members</p>
          </div>
        </div>

        <div className="text-center pt-2 border-t">
          <p>
            Need help? Check the{" "}
            <a
              href="https://ngrok.com/docs/integrations/ollama/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              official ngrok + Ollama guide
            </a>
          </p>
        </div>
      </CardFooter>
    </Card>
  )
}
