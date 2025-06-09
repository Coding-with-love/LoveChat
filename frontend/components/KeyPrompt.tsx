"use client"

import { Button } from "@/frontend/components/ui/button"
import { Key } from "lucide-react"
import { Link } from "react-router"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { getModelConfig } from "@/lib/models"
import { useEffect } from "react"

export default function KeyPrompt() {
  const { keys, debug } = useAPIKeyStore()
  const { selectedModel } = useModelStore()

  const modelConfig = getModelConfig(selectedModel)
  const provider = modelConfig.provider.toLowerCase()
  const hasKeyForModel = !!keys[provider]

  useEffect(() => {
    // Run debug on mount to help troubleshoot
    debug()
  }, [debug])

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center p-4 pr-5 border rounded-lg bg-background shadow-lg gap-4 max-w-md">
        <div className="bg-primary/10 p-2.5 rounded-full">
          <Key className="h-5 w-5 text-primary" />
        </div>

        <div>
          <p className="text-sm font-medium">API key required for {selectedModel}</p>
          <p className="text-xs text-muted-foreground">Add {provider} API key to enable chat</p>
          <div className="text-xs mt-1 text-muted-foreground">
            Available keys: {Object.keys(keys).join(", ") || "none"}
          </div>
        </div>

        <Link to="/settings">
          <Button size="sm" variant="outline" className="ml-2 h-8 text-xs">
            Configure
          </Button>
        </Link>
      </div>
    </div>
  )
}
