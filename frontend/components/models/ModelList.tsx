"use client";

import type React from "react";
import { ChevronDown, CheckSquare, Square, Search } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { ProviderLogo } from "@/frontend/components/ProviderLogo"; // Assuming path
import { cn } from "@/lib/utils";
import { ModelCard } from "./ModelCard";
import type { ModelInfo } from "./types";

interface ModelListProps {
  sortedModels: ModelInfo[];
  hasActiveFilters: boolean;
  favoriteModels: string[]; // Needed for ModelCard's favorite status check
  expandedProviders: Record<string, boolean>;
  onToggleModel: (model: string) => void;
  onToggleFavorite: (model: string) => void;
  onShowDetails: (model: string) => void;
  onToggleProviderExpansion: (provider: string) => void;
  onToggleAllModelsForProvider: (
    providerName: string,
    modelsInGroup: ModelInfo[],
  ) => void;
}

export function ModelList({
  sortedModels,
  hasActiveFilters,
  favoriteModels,
  expandedProviders,
  onToggleModel,
  onToggleFavorite,
  onShowDetails,
  onToggleProviderExpansion,
  onToggleAllModelsForProvider,
}: ModelListProps) {
  // Group models by provider if no filters are active
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

  // Render the models list section based on whether filters are active
  const modelsListSection =
    !hasActiveFilters && groupedModels ? (
      // Render grouped by provider
      Object.entries(groupedModels).map(([provider, models]) => {
        // Determine if the provider group is expanded. Defaults to true if not yet interacted with.
        const isProviderExpanded = expandedProviders[provider] ?? true;
        // Check if all models in this group are currently enabled
        const allModelsAreEnabled = models.every((model) => model.isEnabled);

        return (
          <div key={provider} className="space-y-4">
            {/* Provider Header - Clickable to toggle expansion */}
            <div
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg transition-all duration-200",
                models.some((m) => m.isEnabled) &&
                  "bg-primary/5 border border-primary/20",
              )}
              onClick={() => onToggleProviderExpansion(provider)}
              role="button"
              aria-expanded={isProviderExpanded}
              aria-controls={`provider-models-${provider}`}
            >
              <ProviderLogo
                provider={provider.toLowerCase() as any} // Type assertion for ProviderLogo
                size="md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-semibold">{provider}</h4>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the group header's onClick from firing
                    onToggleAllModelsForProvider(provider, models);
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-60 hover:opacity-100 p-1"
                  aria-label={`Toggle ${provider} models`}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      !isProviderExpanded && "rotate-180",
                    )}
                  />
                </Button>
              </div>
            </div>

            {/* Conditionally render the list of models if the group is expanded */}
            {isProviderExpanded && (
              <div className="grid gap-4" id={`provider-models-${provider}`}>
                {models.map((modelInfo) => (
                  <ModelCard
                    key={modelInfo.model}
                    modelInfo={modelInfo}
                    favoriteModels={favoriteModels}
                    onToggleModel={onToggleModel}
                    onToggleFavorite={onToggleFavorite}
                    onShowDetails={onShowDetails}
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
          <ModelCard
            key={modelInfo.model}
            modelInfo={modelInfo}
            favoriteModels={favoriteModels}
            onToggleModel={onToggleModel}
            onToggleFavorite={onToggleFavorite}
            onShowDetails={onShowDetails}
          />
        ))}
      </div>
    );

  // Show "No models found" message only when filters are active and no results
  const noModelsFound = sortedModels.length === 0 && hasActiveFilters;

  return (
    <>
      {modelsListSection}
      {noModelsFound && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No models found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters to find more models
          </p>
        </div>
      )}
    </>
  );
}
