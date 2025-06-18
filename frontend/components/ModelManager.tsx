// src/components/models/ModelManager.tsx
"use client";

import type React from "react";
import { useState, useMemo, useCallback } from "react";
import { useModelStore } from "@/frontend/stores/ModelStore";
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore";
import { AI_MODELS, getModelConfig, type AIModel } from "@/lib/models";
import { ModelList } from "./models/ModelList";
import { FilterBar } from "./models/FilterBar";
import { ModelDetailsDialog } from "./models/ModelDetailsDialog";
import type {
  ModelInfo,
  FilterState,
  DetailedModelInfo,
  FilterOption,
} from "./models/types";
import { toast } from "sonner"; // Assuming sonner is available
import { Search, Sparkles, Eye, FileText, Lightbulb, Zap } from "lucide-react";
import { ProviderLogo } from "@/frontend/components/ProviderLogo";

// Filter Options are shared between FilterBar and ModelManager for display
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

// --- Helper functions ---

// Helper to get basic model info (used by ModelCard and for initial filtering/sorting)
const getBaseModelInfo = (
  model: AIModel,
  enabledModels: string[],
  favoriteModels: string[],
  apiKey: string | null | undefined, // Pass apiKey for reactivity
): ModelInfo => {
  const config = getModelConfig(model);
  const features: ModelInfo["features"] = [];

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
      searchUrl = "https://gemini.google.com";
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

  const displayName = model.startsWith("ollama:")
    ? model.replace("ollama:", "")
    : model;
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

  // --- Filter Logic ---
  // Memoize filter state check to prevent unnecessary re-renders
  const hasActiveFilters = useMemo(
    () =>
      filters.providers.length > 0 ||
      filters.features.length > 0 ||
      filters.capabilities.length > 0 ||
      filters.showOnlyAvailable ||
      filters.showOnlyFavorites,
    [],
  );

  // Memoize filter matching logic
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
    [filters, favoriteModels],
  ); // Dependencies for filtering

  // --- Model Data Preparation ---
  // Memoize the list of all models
  const allModels = useMemo(
    () => [...AI_MODELS, ...customModels],
    [customModels],
  );

  // Memoize the processed list of models, including API key status and enabled status
  const processedModels: ModelInfo[] = useMemo(() => {
    // Create a map of provider API keys for efficient lookup
    const apiKeyMap = new Map<string, string | null | undefined>();
    FILTER_OPTIONS.providers.forEach((p) =>
      apiKeyMap.set(p.value, getKey(p.value)),
    );

    return allModels.map((model) => {
      const config = getModelConfig(model);
      const apiKey = apiKeyMap.get(config.provider);
      return getBaseModelInfo(model, enabledModels, favoriteModels, apiKey);
    });
  }, [allModels, enabledModels, favoriteModels, getKey]); // Re-calculate if any of these change

  // Memoize the list of models after applying search and filters
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
    const modelsToSort = [...filteredAndSearchedModels];
    if (hasActiveFilters) {
      // Sort by enabled status first, then alphabetically when filters are active
      return modelsToSort.sort((a, b) => {
        if (a.isEnabled !== b.isEnabled) return a.isEnabled ? -1 : 1; // Enabled models first
        return a.name.localeCompare(b.name);
      });
    } else {
      // Sort by provider, then model name when no filters are active
      return modelsToSort.sort((a, b) => {
        if (a.provider !== b.provider) {
          // Define a specific order for providers
          const providerOrder = ["OpenAI", "Google", "OpenRouter", "Ollama"];
          return (
            providerOrder.indexOf(a.provider) -
            providerOrder.indexOf(b.provider)
          );
        }
        return a.name.localeCompare(b.name);
      });
    }
  }, [filteredAndSearchedModels, hasActiveFilters, enabledModels]); // Re-calculate based on filtered list, filter state, and enabled status

  // --- Filter/Search Management Callbacks ---
  const updateFilter = useCallback(
    (type: keyof FilterState, value: string | boolean) => {
      setFilters((prev) => {
        if (type === "showOnlyAvailable" || type === "showOnlyFavorites") {
          return { ...prev, [type]: value as boolean };
        } else {
          const currentValues = prev[type] as string[];
          const newValues = currentValues.includes(value as string)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value as string];
          return { ...prev, [type]: newValues };
        }
      });
    },
    [],
  ); // No dependencies, state setter is stable

  const clearAllFilters = useCallback(() => {
    setFilters({
      providers: [],
      features: [],
      capabilities: [],
      showOnlyAvailable: false,
      showOnlyFavorites: false,
    });
  }, []); // No dependencies

  // Callback to get the count of active filters
  const getActiveFilterCount = useCallback(() => {
    return (
      filters.providers.length +
      filters.features.length +
      filters.capabilities.length +
      (filters.showOnlyAvailable ? 1 : 0) +
      (filters.showOnlyFavorites ? 1 : 0)
    );
  }, [filters]); // Re-calculate if filters change

  // Callback to toggle all models for a specific provider group
  const handleToggleAllModelsForProvider = useCallback(
    (providerName: string, modelsInGroup: ModelInfo[]) => {
      const allEnabled = modelsInGroup.every((model) => model.isEnabled);
      modelsInGroup.forEach((modelInfo) => {
        const shouldBeEnabled = !allEnabled; // If all are enabled, we want to disable; otherwise, enable.
        if (modelInfo.isEnabled !== shouldBeEnabled) {
          // Only toggle if the state needs to change
          toggleModel(modelInfo.model);
        }
      });
    },
    [toggleModel],
  );

  // Callback to toggle the expansion/collapse state of a provider group
  const toggleProviderExpansion = useCallback((provider: string) => {
    setExpandedProviders((prev) => ({ ...prev, [provider]: !prev[provider] }));
  }, []);

  // --- Model Action Callbacks ---
  // Callback to toggle the enabled state of a single model
  const handleToggleModel = useCallback(
    (model: AIModel) => {
      toggleModel(model);
      const isEnabled = enabledModels.includes(model);
      toast.success(
        isEnabled
          ? `${model} removed from quick access`
          : `${model} added to quick access`,
      );
    },
    [toggleModel, enabledModels],
  ); // Dependencies needed for toast message

  // Callback to select recommended models
  const handleSelectRecommended = useCallback(() => {
    // Filter for recommended models (flagship, latest, o1/claude)
    const recommendedModels = sortedModels.filter(
      (info) =>
        info.hasApiKey &&
        (info.model.includes("gpt-4o") ||
          info.model.includes("gemini-2") ||
          info.model.includes("o1") ||
          info.model.includes("claude")),
    );
    let modelsToggled = 0;
    recommendedModels.forEach((info) => {
      if (!info.isEnabled) {
        // Only toggle if not already enabled
        toggleModel(info.model);
        modelsToggled++;
      }
    });
    if (modelsToggled > 0) {
      toast.success(`Enabled ${modelsToggled} recommended models`);
    } else {
      toast.info("All recommended models are already enabled.");
    }
  }, [sortedModels, toggleModel]);

  // Callback to deselect all currently enabled models
  const handleUnselectAll = useCallback(() => {
    enabledModels.forEach((model) => {
      toggleModel(model); // This will toggle them off
    });
    toast.success("Unselected all models");
  }, [enabledModels, toggleModel]);

  // Callback to toggle favorite status of a model
  const handleToggleFavorite = useCallback(
    (model: AIModel) => {
      toggleFavoriteModel(model);
      const isFavorite = favoriteModels.includes(model);
      toast.success(
        isFavorite
          ? `${model} removed from favorites`
          : `${model} added to favorites`,
      );
    },
    [favoriteModels, toggleFavoriteModel],
  );

  // --- Dialog Logic ---
  // Memoize the detailed info for the currently selected model for the dialog
  const detailedModelInfoForDialog = useMemo(() => {
    if (!selectedDetailModelId) return null;
    // Find the base info from the processed models list
    const baseInfo = processedModels.find(
      (m) => m.model === selectedDetailModelId,
    );
    if (!baseInfo) return null; // Should not happen if ID is valid
    return getDetailedModelInfo(selectedDetailModelId, baseInfo);
  }, [selectedDetailModelId, processedModels]);

  // Handlers for showing and closing the dialog
  const handleShowDetails = useCallback((modelId: AIModel) => {
    setSelectedDetailModelId(modelId);
  }, []);
  const handleCloseDialog = useCallback(() => {
    setSelectedDetailModelId(null);
  }, []);

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
          onSearchChange={setSearchQuery}
          onFilterChange={updateFilter}
          onClearFilters={clearAllFilters}
          onSelectRecommended={handleSelectRecommended}
          onUnselectAll={handleUnselectAll}
        />
      </div>

      {/* Models List Section */}
      <div className="space-y-6">
        <ModelList
          sortedModels={sortedModels}
          hasActiveFilters={hasActiveFilters}
          favoriteModels={favoriteModels}
          expandedProviders={expandedProviders}
          onToggleModel={handleToggleModel}
          onToggleFavorite={handleToggleFavorite}
          onShowDetails={handleShowDetails}
          onToggleProviderExpansion={toggleProviderExpansion}
          onToggleAllModelsForProvider={handleToggleAllModelsForProvider}
        />
      </div>

      {/* Model Details Dialog */}
      <ModelDetailsDialog
        selectedDetailModelId={selectedDetailModelId}
        detailedModelInfo={detailedModelInfoForDialog}
        onClose={handleCloseDialog}
        onToggleModel={handleToggleModel}
      />
    </div>
  );
}
