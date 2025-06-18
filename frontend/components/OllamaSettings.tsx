"use client";

import { useState, useEffect } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { useOllamaStore } from "@/frontend/stores/OllamaStore";
import { useModelStore } from "@/frontend/stores/ModelStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash,
  Eye,
  FileText,
  Lightbulb,
  Sparkles,
  ChevronDown,
  Square,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/frontend/components/ui/switch";
import { ProviderLogo } from "@/frontend/components/ProviderLogo";
import { cn } from "@/lib/utils";

export function OllamaSettings() {
  const { baseUrl, setBaseUrl, isConnected, availableModels, testConnection } =
    useOllamaStore();
  const {
    addCustomModel,
    removeCustomModel,
    customModels,
    selectedModel,
    setModel,
  } = useModelStore();

  const [url, setUrl] = useState(baseUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    setUrl(baseUrl);
  }, [baseUrl]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      setBaseUrl(url);
      const success = await testConnection();

      if (success) {
        toast.success("Successfully connected to Ollama");
      } else {
        toast.error("Failed to connect to Ollama");
      }
    } catch (error) {
      console.error("Error connecting to Ollama:", error);
      toast.error("Error connecting to Ollama");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const success = await testConnection();

      if (success) {
        toast.success("Successfully refreshed Ollama models");
      } else {
        toast.error("Failed to refresh Ollama models");
      }
    } catch (error) {
      console.error("Error refreshing Ollama models:", error);
      toast.error("Error refreshing Ollama models");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddModel = (modelName: string) => {
    const ollamaModel = `ollama:${modelName}` as const;
    addCustomModel(ollamaModel);
    toast.success(`Added ${modelName} to available models`);
  };

  const handleRemoveModel = (modelName: string) => {
    const ollamaModel = `ollama:${modelName}` as const;
    removeCustomModel(ollamaModel);
    toast.success(`Removed ${modelName} from available models`);
  };

  const handleSelectModel = (modelName: string) => {
    const ollamaModel = `ollama:${modelName}` as const;
    setModel(ollamaModel);
    toast.success(`Selected ${modelName}`);
  };

  const isModelAdded = (modelName: string) => {
    return customModels.includes(`ollama:${modelName}` as const);
  };

  const isModelSelected = (modelName: string) => {
    return selectedModel === `ollama:${modelName}`;
  };

  // Function to toggle all Ollama models (add/remove from customModels)
  const handleToggleAllOllamaModels = () => {
    // Check if all available models are currently added to customModels
    const allModelsAreAdded = availableModels.every((model) =>
      isModelAdded(model),
    );

    if (allModelsAreAdded) {
      // Deselect All (remove them from customModels)
      availableModels.forEach((model) => {
        // Ensure model name is prefixed correctly for removal
        removeCustomModel(`ollama:${model}` as const);
      });
      toast.success("Deselected all Ollama models");
    } else {
      // Select All (add them to customModels)
      availableModels.forEach((model) => {
        // Ensure model name is prefixed correctly for addition
        addCustomModel(`ollama:${model}` as const);
      });
      toast.success("Selected all Ollama models");
    }
  };

  // Get model features based on model name
  const getModelFeatures = (modelName: string) => {
    const features = [];

    // Add features based on model name patterns
    if (modelName.includes("vision") || modelName.includes("llava")) {
      features.push({
        icon: <Eye className="h-3 w-3" />,
        label: "Vision",
        color: "bg-green-500/10 text-green-600 border-green-500/20",
      });
    }

    if (modelName.includes("coder") || modelName.includes("code")) {
      features.push({
        icon: <FileText className="h-3 w-3" />,
        label: "Code",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      });
    }

    if (
      modelName.includes("reasoning") ||
      modelName.includes("deepseek-r1") ||
      modelName.includes("think")
    ) {
      features.push({
        icon: <Lightbulb className="h-3 w-3" />,
        label: "Reasoning",
        color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      });
    }

    if (modelName.includes("instruct") || modelName.includes("chat")) {
      features.push({
        icon: <Sparkles className="h-3 w-3" />,
        label: "Chat",
        color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      });
    }

    return features;
  };

  // Get model description based on name
  const getModelDescription = (modelName: string) => {
    if (modelName.includes("gemma")) {
      return "Google's Gemma family model, optimized for efficiency and performance.";
    } else if (modelName.includes("llama")) {
      return "Meta's Llama model, excellent for general-purpose conversations.";
    } else if (modelName.includes("mistral")) {
      return "Mistral AI's model, known for strong reasoning capabilities.";
    } else if (modelName.includes("deepseek")) {
      return "DeepSeek's model, specialized in coding and reasoning tasks.";
    } else if (modelName.includes("qwen")) {
      return "Alibaba's Qwen model, multilingual and versatile.";
    } else if (modelName.includes("phi")) {
      return "Microsoft's Phi model, small but capable.";
    } else if (modelName.includes("vicuna")) {
      return "Vicuna model, fine-tuned for conversation.";
    } else if (modelName.includes("wizard")) {
      return "WizardCoder model, specialized for programming tasks.";
    } else {
      return "Run this large language model locally on your machine.";
    }
  };

  return (
    <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <ProviderLogo provider="ollama" size="md" />
          <div>
            <CardTitle className="text-lg">Ollama Connection</CardTitle>
            <CardDescription>
              Connect to your local or remote Ollama server
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ollama Base URL</label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="http://localhost:11434"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
            {isConnected ? (
              <>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    🎉 Connected to Ollama
                  </span>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Ready to use local models
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20">
                  <XCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                    ⏳ Waiting for connection
                  </span>
                  <p className="text-xs text-orange-600 dark:text-orange-500">
                    Make sure Ollama is running
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Refresh and Select All/Deselect All Buttons */}
        <div className="flex justify-between items-center">
          <h3 className="text-base font-medium">Available Models</h3>
          <div className="flex items-center gap-2">
            {" "}
            {/* Group buttons here */}
            {/* Conditionally render the Select/Deselect All button */}
            {isConnected && availableModels.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAllOllamaModels}
              >
                {availableModels.every((model) => isModelAdded(model)) ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
            )}
            {/* Refresh button */}
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Models
              </Button>
            )}
          </div>
        </div>

        {/* Available Models - New Beautiful Card Layout */}
        {isConnected && availableModels.length > 0 && (
          <div className="space-y-4">
            {availableModels.map((model) => {
              const features = getModelFeatures(model);
              const description = getModelDescription(model);
              const added = isModelAdded(model);
              const selected = isModelSelected(model);

              return (
                <div
                  key={model}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-4 transition-all duration-300",
                    added && "ring-2 ring-primary/20 bg-primary/5",
                    "hover:shadow-lg hover:border-primary/20",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Model Icon */}
                      <ProviderLogo provider="ollama" size="md" />

                      {/* Model Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold text-foreground truncate">
                              {model}
                            </h4>
                            {selected && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-primary/10 text-primary border-primary/20"
                              >
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {description}
                          </p>
                        </div>

                        {/* Features */}
                        {features.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {features.map((feature, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className={cn("text-xs gap-1", feature.color)}
                              >
                                {feature.icon}
                                {feature.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {added ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveModel(model)}
                            className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash className="h-4 w-4" />
                            Remove
                          </Button>
                          {!selected && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectModel(model)}
                              className="gap-2"
                            >
                              Select
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddModel(model)}
                          className="gap-2"
                        >
                          Add Model
                        </Button>
                      )}

                      <Switch
                        checked={added}
                        onCheckedChange={() =>
                          added
                            ? handleRemoveModel(model)
                            : handleAddModel(model)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isConnected && availableModels.length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground space-y-2">
              <p>No models found on your Ollama server.</p>
              <p className="text-sm">
                Try pulling a model:{" "}
                <code className="bg-muted px-2 py-1 rounded">
                  ollama pull gemma2
                </code>
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Collapsible Setup Assistant */}
      <div className="border-t">
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            className="w-full justify-between hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <span className="text-lg">🚀</span>
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold">Setup Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Complete Ollama integration guide
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showSetupGuide && "rotate-180",
              )}
            />
          </Button>

          {showSetupGuide && (
            <div className="mt-4 space-y-6 bg-gradient-to-br from-muted/20 to-muted/40 rounded-lg p-6">
              {/* Progress Indicator */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      isConnected ? "bg-green-500" : "bg-muted-foreground",
                    )}
                  />
                  <span className="text-sm font-medium">Step 1: Install</span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      isConnected ? "bg-green-500" : "bg-muted-foreground",
                    )}
                  />
                  <span className="text-sm font-medium">Step 2: Connect</span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      availableModels.length > 0
                        ? "bg-green-500"
                        : "bg-muted-foreground",
                    )}
                  />
                  <span className="text-sm font-medium">Step 3: Models</span>
                </div>
              </div>

              {/* Keep existing setup steps but with better styling */}
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold flex items-center justify-center">
                    1
                  </div>
                  <h4 className="text-base font-medium text-foreground">
                    Install & Setup Ollama
                  </h4>
                </div>
                <div className="ml-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Download Ollama from{" "}
                    <a
                      href="https://ollama.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline font-medium"
                    >
                      ollama.com
                    </a>
                    , then run these commands:
                  </p>
                  <div className="space-y-2">
                    <div className="bg-black/5 dark:bg-white/5 border rounded-lg p-3">
                      <code className="text-sm font-mono text-foreground">
                        ollama pull gemma2
                      </code>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 border rounded-lg p-3">
                      <code className="text-sm font-mono text-foreground">
                        ollama serve
                      </code>
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ✅ Ollama will run on{" "}
                      <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded font-mono">
                        http://localhost:11434
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white text-sm font-semibold flex items-center justify-center">
                    2
                  </div>
                  <h4 className="text-base font-medium text-foreground">
                    Setup ngrok (for Production Access)
                  </h4>
                </div>
                <div className="ml-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign up at{" "}
                    <a
                      href="https://dashboard.ngrok.com/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline font-medium"
                    >
                      ngrok.com
                    </a>{" "}
                    and get your auth token from{" "}
                    <a
                      href="https://dashboard.ngrok.com/get-started/your-authtoken"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline font-medium"
                    >
                      your dashboard
                    </a>
                    :
                  </p>
                  <div className="space-y-2">
                    <div className="bg-black/5 dark:bg-white/5 border rounded-lg p-3">
                      <code className="text-sm font-mono text-foreground">
                        brew install ngrok
                      </code>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 border rounded-lg p-3">
                      <code className="text-sm font-mono text-foreground">
                        ngrok config add-authtoken YOUR_TOKEN
                      </code>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 border rounded-lg p-3">
                      <code className="text-sm font-mono text-foreground">
                        ngrok http 11434 --host-header=localhost
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-semibold flex items-center justify-center">
                    3
                  </div>
                  <h4 className="text-base font-medium text-foreground">
                    Configure This App
                  </h4>
                </div>
                <div className="ml-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Copy the ngrok HTTPS URL (e.g.,{" "}
                    <code className="bg-muted px-2 py-1 rounded font-mono">
                      https://abc123.ngrok.app
                    </code>
                    ) into the URL field above and click "Connect".
                  </p>
                </div>
              </div>

              {/* Security Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1">
                    <span className="text-lg">🔒</span>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                      Security Note
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Your ngrok URL is public! Consider adding authentication:
                    </p>
                    <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 mt-2">
                      <code className="text-sm font-mono text-yellow-800 dark:text-yellow-200">
                        ngrok http 11434 --basic-auth "user:password"
                        --host-header=localhost
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Modes */}
              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1">
                    <span className="text-lg">📋</span>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      Usage Modes
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="text-sm">
                          <span className="font-medium">
                            Local Development:
                          </span>{" "}
                          Use{" "}
                          <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                            http://localhost:11434
                          </code>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-sm">
                          <span className="font-medium">
                            Production/Remote:
                          </span>{" "}
                          Use your ngrok HTTPS URL
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span className="text-sm">
                          <span className="font-medium">Team Sharing:</span>{" "}
                          Share your ngrok URL with team members
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Help Link */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Need help? Check the{" "}
                  <a
                    href="https://ngrok.com/docs/integrations/ollama/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 underline font-medium"
                  >
                    official ngrok + Ollama guide
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
