"use client";

import type React from "react";
import { useState, useMemo, useCallback } from "react";
import { useModelStore } from "@/frontend/stores/ModelStore";
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore";
import { AI_MODELS, getModelConfig, type AIModel } from "@/lib/models";
import { FilterBar } from "@/frontend/components/models/FilterBar";
import { ModelCard } from "@/frontend/components/models/ModelCard";
import { ModelDetailsDialog } from "@/frontend/components/models/ModelDetailsDialog";
import type {
  ModelInfo,
  FilterState,
  DetailedModelInfo,
  FilterOption,
} from "@/frontend/components/models/types";
import { toast } from "sonner"; // Assuming sonner is available
import {
  Search,
  Sparkles,
  Eye,
  FileText,
  Lightbulb,
  Zap,
  CheckSquare,
  Square,
  ChevronDown,
} from "lucide-react";
import { ProviderLogo } from "@/frontend/components/ProviderLogo"; // User's specified path
import { cn } from "@/lib/utils";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";

// --- Filter Options Definition ---
// Shared across FilterBar and ModelManager for rendering filter UI and logic.
const FILTER_OPTIONS: {
  providers: FilterOption[];
  features: FilterOption[];
  capabilities: FilterOption[];
} = {
  providers: [
    {
      value: "openai",
      label: "OpenAI",
      icon: <ProviderLogo provider="openai" size="sm" />,
    },
    {
      value: "google",
      label: "Google",
      icon: <ProviderLogo provider="google" size="sm" />,
    },
    {
      value: "openrouter",
      label: "OpenRouter",
      icon: <ProviderLogo provider="openrouter" size="sm" />,
    },
    {
      value: "ollama",
      label: "Ollama",
      icon: <ProviderLogo provider="ollama" size="sm" />,
    },
  ],
  features: [
    {
      value: "search",
      label: "Search",
      icon: <Search className="h-3 w-3" />,
      color: "text-blue-600",
    },
    {
      value: "thinking",
      label: "Thinking",
      icon: <Sparkles className="h-3 w-3" />,
      color: "text-purple-600",
    },
    {
      value: "vision",
      label: "Vision",
      icon: <Eye className="h-3 w-3" />,
      color: "text-green-600",
    },
    {
      value: "pdfs",
      label: "PDFs",
      icon: <FileText className="h-3 w-3" />,
      color: "text-indigo-600",
    },
    {
      value: "reasoning",
      label: "Reasoning",
      icon: <Lightbulb className="h-3 w-3" />,
      color: "text-orange-600",
    },
    {
      value: "fast",
      label: "Fast",
      icon: <Zap className="h-3 w-3" />,
      color: "text-yellow-600",
    },
  ],
  capabilities: [
    { value: "latest", label: "Latest Models" },
    { value: "flagship", label: "Flagship Models" },
    { value: "experimental", label: "Experimental" },
  ],
};

// --- Top-Level Helper Functions ---

// Helper to get basic model info (used by ModelCard and for initial filtering/sorting)
const getBaseModelInfo = (
  model: AIModel,
  enabledModels: string[],
  favoriteModels: string[],
  apiKey: string | null | undefined, // Pass apiKey for reactivity
): ModelInfo => {
  const config = getModelConfig(model);
  const features: ModelInfo["features"] = [];

  // Add feature badges based on model capabilities
  if (config.supportsSearch)
    features.push({
      icon: <Search className="h-3 w-3" />,
      label: "Search",
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    });
  if (config.supportsThinking)
    features.push({
      icon: <Sparkles className="h-3 w-3" />,
      label: "Thinking",
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    });
  if (
    model.includes("gpt-4") ||
    model.includes("gemini") ||
    model.includes("claude")
  ) {
    features.push({
      icon: <Eye className="h-3 w-3" />,
      label: "Vision",
      color: "bg-green-500/10 text-green-600 border-green-500/20",
    });
  }
  if (model.includes("gemini") || model.includes("claude")) {
    features.push({
      icon: <FileText className="h-3 w-3" />,
      label: "PDFs",
      color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    });
  }
  if (
    model.includes("flash") ||
    model.includes("lite") ||
    model.includes("mini")
  ) {
    features.push({
      icon: <Zap className="h-3 w-3" />,
      label: "Fast",
      color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    });
  }
  if (
    model.includes("o1") ||
    model.includes("o3") ||
    model.includes("reasoning")
  ) {
    features.push({
      icon: <Lightbulb className="h-3 w-3" />,
      label: "Reasoning",
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    });
  }

  let providerName: string;
  let description: string;
  let searchUrl: string | undefined;

  // Determine provider name and description
  switch (config.provider) {
    case "openai":
      providerName = "OpenAI";
      if (model.includes("o3"))
        description =
          "OpenAI's most advanced reasoning model, excelling at complex problem-solving.";
      else if (model.includes("o1"))
        description =
          "OpenAI's reasoning model that thinks step-by-step through complex problems.";
      else if (model.includes("gpt-4o"))
        description =
          "OpenAI's flagship model, known for speed and accuracy (and also web search!).";
      else if (model.includes("gpt-4-turbo"))
        description =
          "Optimized version of GPT-4 with improved performance and efficiency.";
      else description = "Advanced language model from OpenAI.";
      break;
    case "google":
      providerName = "Google";
      if (model.includes("2.5")) {
        if (model.includes("thinking"))
          description = "Google's latest fast model, but now it can think!";
        else if (model.includes("pro"))
          description =
            "Google's most advanced model, excelling at complex reasoning and problem-solving.";
        else
          description =
            "Google's latest fast model, known for speed and accuracy (and also web search!).";
      } else if (model.includes("2.0")) {
        if (model.includes("lite"))
          description = "Similar to 2.0 Flash, but even faster.";
        else
          description =
            "Google's flagship model, known for speed and accuracy (and also web search!).";
      } else description = "Advanced language model from Google.";
      searchUrl = "https://gemini.google.com"; // Gemini search URL
      break;
    case "openrouter":
      providerName = "OpenRouter";
      description =
        "Access to various AI models through OpenRouter's unified API.";
      break;
    case "ollama":
      providerName = "Ollama";
      description = "Run large language models locally on your machine.";
      break;
    default:
      providerName = "Unknown";
      description = "AI language model.";
  }

  // Display name for Ollama models
  const displayName = model.startsWith("ollama:")
    ? model.replace("ollama:", "")
    : model;
  // Determine if API key is available or required
  const hasApiKey =
    config.provider === "ollama" || config.provider === "google" || !!apiKey;
  const isUsingDefaultKey = config.provider !== "ollama" && !apiKey;

  return {
    model,
    icon: <ProviderLogo provider={config.provider} size="lg" />,
    name: displayName,
    description,
    provider: providerName,
    features,
    isEnabled: enabledModels.includes(model),
    hasApiKey,
    isUsingDefaultKey,
    searchUrl,
  };
};

// Helper to get detailed model info for the dialog
const getDetailedModelInfo = (
  model: AIModel,
  baseInfo: ModelInfo,
): DetailedModelInfo => {
  const config = getModelConfig(model);

  let detailedDescription = "";
  let capabilities: string[] = [];
  let limitations: string[] = [];
  let bestUseCases: string[] = [];

  // Provide detailed descriptions, capabilities, limitations, and best use cases
  // based on the model provider and specific model identifiers.
  switch (config.provider) {
    case "openai":
      if (model.includes("o3")) {
        detailedDescription =
          "OpenAI o3 represents the latest advancement in reasoning models. This model excels at complex problem-solving, mathematical reasoning, scientific analysis, and multi-step logical thinking.";
        capabilities = [
          "Advanced mathematical reasoning",
          "Scientific problem solving",
          "Complex logical analysis",
          "Multi-step reasoning",
          "Academic research assistance",
        ];
        limitations = [
          "Higher latency due to reasoning process",
          "More expensive per token",
          "May be overkill for simple tasks",
        ];
        bestUseCases = [
          "Academic research and analysis",
          "Complex mathematical problems",
          "Scientific hypothesis testing",
          "Technical troubleshooting",
        ];
      } else if (model.includes("o1")) {
        detailedDescription =
          "OpenAI o1 is designed for complex reasoning tasks that require careful thought and planning. It uses reinforcement learning to reason through problems step-by-step.";
        capabilities = [
          "Step-by-step reasoning",
          "Mathematical problem solving",
          "Scientific analysis",
          "Complex coding tasks",
        ];
        limitations = [
          "Slower response times",
          "Higher cost per token",
          "Limited web search capabilities",
        ];
        bestUseCases = [
          "Academic research",
          "Complex coding problems",
          "Mathematical proofs",
          "Scientific analysis",
        ];
      } else if (model.includes("o4")) {
        detailedDescription =
          "OpenAI o4 represents the next generation of reasoning models, offering enhanced problem-solving capabilities and advanced logical analysis. Building on the success of o3, o4 provides improved efficiency and broader reasoning capabilities.";
        capabilities = [
          "Enhanced mathematical reasoning",
          "Advanced scientific analysis",
          "Complex multi-step problem solving",
          "Improved logical deduction",
          "Academic research and synthesis",
        ];
        limitations = [
          "Higher computational cost",
          "Increased response latency",
          "May be excessive for simple queries",
        ];
        bestUseCases = [
          "Complex academic research",
          "Advanced mathematical proofs",
          "Scientific hypothesis development",
          "Technical system design",
        ];
      } else if (model.includes("gpt-4.5")) {
        detailedDescription =
          "GPT-4.5 is an enhanced version of GPT-4, featuring improved reasoning capabilities, better instruction following, and enhanced multimodal understanding. It offers superior performance across a wide range of tasks.";
        capabilities = [
          "Enhanced natural language understanding",
          "Improved multimodal processing",
          "Better instruction following",
          "Advanced code generation and debugging",
          "Superior creative and analytical writing",
        ];
        limitations = [
          "Higher token costs than GPT-4",
          "May be slower for simple tasks",
          "Training data limitations",
        ];
        bestUseCases = [
          "Complex content creation",
          "Advanced code development",
          "Detailed analysis and research",
          "Professional writing and editing",
        ];
      } else if (model.includes("gpt-4.1")) {
        detailedDescription =
          "GPT-4.1 is an improved iteration of GPT-4, offering enhanced performance, better accuracy, and improved handling of nuanced instructions. It provides a balanced upgrade from the original GPT-4.";
        capabilities = [
          "Improved natural language processing",
          "Enhanced accuracy and precision",
          "Better context understanding",
          "Advanced reasoning capabilities",
          "Improved code generation",
        ];
        limitations = [
          "Moderate increase in cost",
          "May have slightly higher latency",
          "Training data cutoff limitations",
        ];
        bestUseCases = [
          "Professional content creation",
          "Code development and review",
          "Academic writing and research",
          "Business analysis and reporting",
        ];
      } else if (model.includes("gpt-4o")) {
        detailedDescription =
          "GPT-4o is OpenAI's flagship model, offering the best balance of speed, intelligence, and capabilities. It excels at natural conversations, creative tasks, and analysis.";
        capabilities = [
          "Natural language understanding",
          "Image analysis and description",
          "Web search integration",
          "Code generation and debugging",
          "Creative writing and ideation",
        ];
        limitations = [
          "May hallucinate facts occasionally",
          "Limited real-time information",
          "Training data cutoff limitations",
        ];
        bestUseCases = [
          "General conversation and assistance",
          "Creative writing projects",
          "Code development and review",
          "Research and analysis",
        ];
      }
      break;

    case "google":
      if (model.includes("2.5")) {
        detailedDescription =
          "Gemini 2.5 represents Google's most advanced AI model, designed for complex tasks requiring deep understanding and analysis.";
        capabilities = [
          "Advanced multimodal understanding",
          "Complex reasoning and analysis",
          "Web search integration",
          "Long context understanding",
        ];
        limitations = [
          "Higher computational requirements",
          "May be slower for simple tasks",
          "Regional availability may vary",
        ];
        bestUseCases = [
          "Complex research and analysis",
          "Advanced problem solving",
          "Multi-step project planning",
          "Professional content creation",
        ];
      } else if (model.includes("flash")) {
        detailedDescription =
          "Gemini Flash models are optimized for speed and efficiency while maintaining high quality output. Perfect for real-time applications.";
        capabilities = [
          "Ultra-fast response times",
          "Web search integration",
          "Multimodal understanding",
          "Efficient processing",
        ];
        limitations = [
          "May sacrifice some accuracy for speed",
          "Limited context for very long conversations",
        ];
        bestUseCases = [
          "Real-time chat applications",
          "Quick content generation",
          "Fast web search and summaries",
        ];
      }
      break;

    default:
      detailedDescription = baseInfo.description;
      capabilities = [
        "General language understanding",
        "Text generation",
        "Basic analysis",
      ];
      limitations = ["Varies by specific model"];
      bestUseCases = ["General purpose tasks"];
  }

  return {
    ...baseInfo,
    detailedDescription,
    capabilities,
    limitations,
    bestUseCases,
  };
};

// --- ModelManager Component ---
export function ModelManager() {
  // Get state and actions from Zustand stores
  const {
    enabledModels,
    toggleModel,
    customModels,
    favoriteModels,
    toggleFavoriteModel,
  } = useModelStore();
  const { getKey } = useAPIKeyStore();

  // Local component state
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    providers: [],
    features: [],
    capabilities: [],
    showOnlyAvailable: false,
    showOnlyFavorites: false,
  });
  const [expandedProviders, setExpandedProviders] = useState<
    Record<string, boolean>
  >({});
  const [selectedDetailModelId, setSelectedDetailModelId] =
    useState<AIModel | null>(null);

  // --- Filter Logic Callbacks ---
  // Memoize filter state check to prevent unnecessary re-renders
  const hasActiveFilters = useMemo(
    () =>
      filters.providers.length > 0 ||
      filters.features.length > 0 ||
      filters.capabilities.length > 0 ||
      filters.showOnlyAvailable ||
      filters.showOnlyFavorites,
    [filters], // Depend on filters state
  );

  // Memoize filter matching logic for performance
  const modelMatchesFilters = useCallback(
    (modelInfo: ModelInfo) => {
      // Provider filter
      if (
        filters.providers.length > 0 &&
        !filters.providers.includes(modelInfo.provider.toLowerCase())
      )
        return false;

      // Features filter
      const modelFeatures = modelInfo.features.map((f) =>
        f.label.toLowerCase(),
      );
      if (
        filters.features.length > 0 &&
        !filters.features.some((f) => modelFeatures.includes(f))
      )
        return false;

      // Capabilities filter
      const matchesCapability = filters.capabilities.some((capability) => {
        switch (capability) {
          case "latest":
            return (
              modelInfo.model.includes("2.5") ||
              modelInfo.model.includes("o3") ||
              modelInfo.model.includes("2.0")
            );
          case "flagship":
            return (
              modelInfo.model.includes("gpt-4o") ||
              modelInfo.model.includes("gemini-2.5-pro") ||
              modelInfo.model.includes("claude-3-5-sonnet")
            );
          case "experimental":
            return (
              modelInfo.model.includes("exp") ||
              modelInfo.model.includes("preview") ||
              modelInfo.model.includes("thinking")
            );
          default:
            return false;
        }
      });
      if (filters.capabilities.length > 0 && !matchesCapability) return false;

      // Availability filter
      if (filters.showOnlyAvailable && !modelInfo.hasApiKey) return false;

      // Favorites filter
      if (
        filters.showOnlyFavorites &&
        !favoriteModels.includes(modelInfo.model)
      )
        return false;

      return true;
    },
    [filters, favoriteModels], // Dependencies for filtering
  );

  // --- Model Data Preparation ---
  // Memoize the list of all models (AI_MODELS + customModels)
  const allModels = useMemo(
    () => [...AI_MODELS, ...customModels],
    [customModels],
  );

  // Memoize the processed list of models, including API key status and enabled status
  const processedModels: ModelInfo[] = useMemo(() => {
    const apiKeyMap = new Map<string, string | null | undefined>();
    // Pre-fetch API keys for all providers for efficiency
    FILTER_OPTIONS.providers.forEach((p) =>
      apiKeyMap.set(p.value, getKey(p.value)),
    );

    return allModels.map((model) => {
      const config = getModelConfig(model);
      const apiKey = apiKeyMap.get(config.provider);
      // Use the top-level helper function
      return getBaseModelInfo(model, enabledModels, favoriteModels, apiKey);
    });
  }, [allModels, enabledModels, favoriteModels, getKey]); // Re-calculate if store states change

  // Memoize the list of models after applying search query and filters
  const filteredAndSearchedModels = useMemo(() => {
    return processedModels.filter((modelInfo) => {
      const matchesSearch =
        modelInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        modelInfo.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        modelInfo.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && modelMatchesFilters(modelInfo);
    });
  }, [processedModels, searchQuery, modelMatchesFilters]); // Re-calculate on search or filter changes

  // Memoize the sorted list of models
  const sortedModels = useMemo(() => {
    const modelsToSort = [...filteredAndSearchedModels]; // Create a copy to avoid mutating filtered list
    if (hasActiveFilters) {
      // Sort by enabled status first, then alphabetically when filters are active
      return modelsToSort.sort((a, b) => {
        if (a.isEnabled !== b.isEnabled) return a.isEnabled ? -1 : 1; // Enabled models appear first
        return a.name.localeCompare(b.name);
      });
    } else {
      // Sort by provider, then model name when no filters are active
      return modelsToSort.sort((a, b) => {
        if (a.provider !== b.provider) {
          // Define a specific order for providers for consistent grouping
          const providerOrder = ["OpenAI", "Google", "OpenRouter", "Ollama"];
          return (
            providerOrder.indexOf(a.provider) -
            providerOrder.indexOf(b.provider)
          );
        }
        return a.name.localeCompare(b.name);
      });
    }
  }, [filteredAndSearchedModels, hasActiveFilters, enabledModels]); // Dependencies ensure sorting is up-to-date

  // --- Filter/Search Management Callbacks ---
  // Update filter state
  const updateFilter = useCallback(
    (type: keyof FilterState, value: string | boolean) => {
      setFilters((prev) => {
        if (type === "showOnlyAvailable" || type === "showOnlyFavorites") {
          // Toggle boolean filters
          return { ...prev, [type]: value as boolean };
        } else {
          // Handle array filters (providers, features, capabilities)
          const currentValues = prev[type] as string[];
          const newValues = currentValues.includes(value as string)
            ? currentValues.filter((v) => v !== value) // Remove if already present
            : [...currentValues, value as string]; // Add if not present
          return { ...prev, [type]: newValues };
        }
      });
    },
    [], // State setter is stable, no dependencies needed
  );

  // Clear all active filters
  const clearAllFilters = useCallback(() => {
    setFilters({
      providers: [],
      features: [],
      capabilities: [],
      showOnlyAvailable: false,
      showOnlyFavorites: false,
    });
  }, []);

  // Get the count of currently active filters for display
  const getActiveFilterCount = useCallback(() => {
    return (
      filters.providers.length +
      filters.features.length +
      filters.capabilities.length +
      (filters.showOnlyAvailable ? 1 : 0) +
      (filters.showOnlyFavorites ? 1 : 0)
    );
  }, [filters]); // Re-calculate if filters state changes

  // Callback to toggle all models for a specific provider group (select/deselect all)
  const handleToggleAllModelsForProvider = useCallback(
    (providerName: string, modelsInGroup: ModelInfo[]) => {
      // Determine if all models in this group are currently enabled.
      const allEnabled = modelsInGroup.every((model) => model.isEnabled);
      modelsInGroup.forEach((modelInfo) => {
        // If all are enabled, we want to disable them. If any is not enabled, we want to enable them.
        const shouldBeEnabled = !allEnabled;
        // Only toggle if the current state is different from the desired state to avoid unnecessary updates.
        if (modelInfo.isEnabled !== shouldBeEnabled) {
          toggleModel(modelInfo.model);
        }
      });
    },
    [toggleModel], // Dependency on toggleModel
  );

  // Callback to toggle the expansion/collapse state of a provider group
  const toggleProviderExpansion = useCallback((provider: string) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [provider]: !prev[provider], // Toggle the boolean state for the provider
    }));
  }, []);

  // --- Model Action Callbacks ---
  // Callback to toggle the enabled state of a single model
  const handleToggleModel = useCallback(
    (model: AIModel) => {
      toggleModel(model); // Toggle the model's enabled state
      const isEnabled = enabledModels.includes(model); // Check the state *before* toggling for toast message
      toast.success(
        isEnabled
          ? `${model} removed from quick access`
          : `${model} added to quick access`,
      );
    },
    [toggleModel, enabledModels], // Dependencies on store actions/state
  );

  // Callback to select recommended models (e.g., flagship, latest)
  const handleSelectRecommended = useCallback(() => {
    // Identify recommended models (e.g., based on flags like gpt-4o, gemini-2, o1, claude)
    const recommendedModels = sortedModels.filter(
      (info) =>
        info.hasApiKey && // Ensure they have an API key
        (info.model.includes("gpt-4o") ||
          info.model.includes("gemini-2") ||
          info.model.includes("o1") ||
          info.model.includes("claude")),
    );
    let modelsToggled = 0;
    recommendedModels.forEach((info) => {
      if (!info.isEnabled) {
        // Only toggle if the model is not already enabled
        toggleModel(info.model);
        modelsToggled++;
      }
    });
    // Provide feedback based on whether any models were actually toggled
    if (modelsToggled > 0) {
      toast.success(`Enabled ${modelsToggled} recommended models`);
    } else {
      toast.info("All recommended models are already enabled.");
    }
  }, [sortedModels, toggleModel]); // Dependencies on current sorted models and toggle action

  // Callback to deselect all currently enabled models
  const handleUnselectAll = useCallback(() => {
    enabledModels.forEach((model) => {
      toggleModel(model); // This action toggles them off
    });
    toast.success("Unselected all models");
  }, [enabledModels, toggleModel]);

  // Callback to toggle favorite status of a model
  const handleToggleFavorite = useCallback(
    (model: AIModel) => {
      toggleFavoriteModel(model); // Toggle favorite status
      const isFavorite = favoriteModels.includes(model); // Check current state for toast message
      toast.success(
        isFavorite
          ? `${model} removed from favorites`
          : `${model} added to favorites`,
      );
    },
    [favoriteModels, toggleFavoriteModel], // Dependencies on store state/actions
  );

  // --- Dialog Logic ---
  // Memoize the detailed info for the currently selected model for the dialog
  const detailedModelInfoForDialog = useMemo(() => {
    if (!selectedDetailModelId) return null; // Return null if no model is selected
    // Find the base info from the processed models list
    const baseInfo = processedModels.find(
      (m) => m.model === selectedDetailModelId,
    );
    if (!baseInfo) return null; // Should not happen if ID is valid, but good practice
    // Use the top-level helper function to get detailed info
    return getDetailedModelInfo(selectedDetailModelId, baseInfo);
  }, [selectedDetailModelId, processedModels]); // Re-calculate if selected model or processed models change

  // Handlers for showing and closing the detail dialog
  const handleShowDetails = useCallback((modelId: AIModel) => {
    setSelectedDetailModelId(modelId);
  }, []);
  const handleCloseDialog = useCallback(() => {
    setSelectedDetailModelId(null);
  }, []);

  // --- Rendering Logic ---
  // Memoize the main list rendering to avoid recomputing if data hasn't changed significantly
  const modelsListSection = useMemo(() => {
    // Group models by provider only if no filters are active
    const groupedModels = hasActiveFilters
      ? null
      : sortedModels.reduce(
          (groups, modelInfo) => {
            const provider = modelInfo.provider;
            if (!groups[provider]) {
              groups[provider] = [];
            }
            groups[provider].push(modelInfo);
            return groups;
          },
          {} as Record<string, ModelInfo[]>,
        );

    // Render the models list section: either grouped or as a flat list
    return !hasActiveFilters && groupedModels ? (
      // Render grouped by provider
      Object.entries(groupedModels).map(([provider, models]) => {
        // Determine if the provider group is expanded. Default to true (expanded) if state is undefined.
        const isProviderExpanded = expandedProviders[provider] ?? true;
        // Check if all models in this group are currently enabled for the "Select All" button state
        const allModelsAreEnabled = models.every((model) => model.isEnabled);

        return (
          <div key={provider} className="space-y-4">
            {/* Provider Header - Clickable to toggle expansion */}
            <div
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg transition-all duration-200",
                // Highlight group if any models are enabled
                models.some((m) => m.isEnabled) &&
                  "bg-primary/5 border border-primary/20",
              )}
              onClick={() => toggleProviderExpansion(provider)} // Toggle expansion on click
              role="button"
              aria-expanded={isProviderExpanded} // ARIA attribute for accessibility
              aria-controls={`provider-models-${provider}`} // Link to the content
            >
              {/* Provider Logo and Name */}
              <ProviderLogo
                provider={provider.toLowerCase() as any} // Type assertion for ProviderLogo
                size="md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-semibold">{provider}</h4>
                  {/* Badge showing count of enabled models in the group */}
                  {models.some((m) => m.isEnabled) && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-primary/10 text-primary"
                    >
                      {models.filter((m) => m.isEnabled).length} active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {models.length} model{models.length !== 1 ? "s" : ""}{" "}
                  available
                </p>
              </div>

              {/* Controls: Select All/Deselect All and Expand/Collapse icons */}
              <div className="flex items-center gap-2">
                {/* Select All / Deselect All Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the group header's onClick from firing
                    handleToggleAllModelsForProvider(provider, models);
                  }}
                  className="gap-2"
                  aria-label={
                    allModelsAreEnabled
                      ? "Deselect all models in this family"
                      : "Select all models in this family"
                  }
                >
                  {allModelsAreEnabled ? (
                    <>
                      <Square className="h-4 w-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Select All
                    </>
                  )}
                </Button>
                {/* Expand/Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-60 hover:opacity-100 p-1"
                  aria-label={`Toggle ${provider} models`}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      !isProviderExpanded && "rotate-180", // Rotate icon when collapsed
                    )}
                  />
                </Button>
              </div>
            </div>

            {/* Conditionally render the list of models if the group is expanded */}
            {isProviderExpanded && (
              <div className="grid gap-4" id={`provider-models-${provider}`}>
                {models.map((modelInfo) => (
                  <ModelCard // Render each model using the ModelCard component
                    key={modelInfo.model}
                    modelInfo={modelInfo}
                    favoriteModels={favoriteModels}
                    onToggleModel={handleToggleModel}
                    onToggleFavorite={handleToggleFavorite}
                    onShowDetails={handleShowDetails}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })
    ) : (
      // Render flat list when filters are active
      <div className="space-y-4">
        {sortedModels.map((modelInfo) => (
          <ModelCard // Render each model using the ModelCard component
            key={modelInfo.model}
            modelInfo={modelInfo}
            favoriteModels={favoriteModels}
            onToggleModel={handleToggleModel}
            onToggleFavorite={handleToggleFavorite}
            onShowDetails={handleShowDetails}
          />
        ))}
      </div>
    );
  }, [
    // Dependencies for re-rendering modelsListSection
    hasActiveFilters,
    sortedModels,
    expandedProviders,
    favoriteModels,
    handleToggleAllModelsForProvider,
    handleShowDetails,
    handleToggleFavorite,
    handleToggleModel,
    toggleProviderExpansion,
  ]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold">Available Models</h3>
          <p className="text-sm text-muted-foreground">
            Choose which models appear in your model selector. This won't affect
            existing conversations.
          </p>
        </div>

        {/* Filter Bar Component */}
        <FilterBar
          searchQuery={searchQuery}
          filters={filters}
          onSearchChange={setSearchQuery} // Update search query state
          onFilterChange={updateFilter} // Update filter state
          onClearFilters={clearAllFilters} // Clear all filters
          onSelectRecommended={handleSelectRecommended} // Action for selecting recommended
          onUnselectAll={handleUnselectAll} // Action for unselecting all
        />
      </div>

      {/* Models List Section */}
      <div className="space-y-6">
        {modelsListSection} {/* Render the memoized list */}
        {/* Display "No models found" message only when filters are active and no results */}
        {sortedModels.length === 0 && hasActiveFilters && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No models found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters to find more models
            </p>
          </div>
        )}
      </div>

      {/* Model Details Dialog */}
      <ModelDetailsDialog
        selectedDetailModelId={selectedDetailModelId} // Pass the ID of the selected model
        detailedModelInfo={detailedModelInfoForDialog} // Pass the computed detailed info
        onClose={handleCloseDialog} // Handler to close the dialog
        onToggleModel={handleToggleModel} // Allow toggling model from dialog
      />
    </div>
  );
}
