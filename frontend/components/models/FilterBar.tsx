"use client";

import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Switch } from "@/frontend/components/ui/switch";
import { Input } from "@/frontend/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/frontend/components/ui/popover";
import {
  SlidersHorizontal,
  X,
  Search,
  Sparkles,
  Eye,
  FileText,
  CheckSquare,
  Square,
  Lightbulb,
  Zap,
} from "lucide-react";
import type React from "react";
import type { FilterState, FilterOption } from "./types";
import { ProviderLogo } from "@/frontend/components/ProviderLogo"; // Assuming path

interface FilterBarProps {
  searchQuery: string;
  filters: FilterState;
  onSearchChange: (query: string) => void;
  onFilterChange: (type: keyof FilterState, value: string | boolean) => void;
  onClearFilters: () => void;
  onSelectRecommended: () => void;
  onUnselectAll: () => void;
}

// Filter Options are defined here as they are used to render the filter UI
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

export function FilterBar({
  searchQuery,
  filters,
  onSearchChange,
  onFilterChange,
  onClearFilters,
  onSelectRecommended,
  onUnselectAll,
}: FilterBarProps) {
  const getActiveFilterCount = () => {
    return (
      filters.providers.length +
      filters.features.length +
      filters.capabilities.length +
      (filters.showOnlyAvailable ? 1 : 0) +
      (filters.showOnlyFavorites ? 1 : 0)
    );
  };

  return (
    <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 hover:scale-105 transition-transform"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Advanced Filters
                {getActiveFilterCount() > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs ml-1 bg-primary/20 text-primary"
                  >
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
                      onClick={onClearFilters}
                      className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Provider Filters */}
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">
                    Providers
                  </h5>
                  <div className="space-y-2">
                    {FILTER_OPTIONS.providers.map((provider) => (
                      <div
                        key={provider.value}
                        className="flex items-center space-x-2"
                      >
                        <Switch
                          id={`provider-${provider.value}`}
                          checked={filters.providers.includes(provider.value)}
                          onCheckedChange={() =>
                            onFilterChange("providers", provider.value)
                          }
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
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">
                    Features
                  </h5>
                  <div className="space-y-2">
                    {FILTER_OPTIONS.features.map((feature) => (
                      <div
                        key={feature.value}
                        className="flex items-center space-x-2"
                      >
                        <Switch
                          id={`feature-${feature.value}`}
                          checked={filters.features.includes(feature.value)}
                          onCheckedChange={() =>
                            onFilterChange("features", feature.value)
                          }
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
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">
                    Capabilities
                  </h5>
                  <div className="space-y-2">
                    {FILTER_OPTIONS.capabilities.map((capability) => (
                      <div
                        key={capability.value}
                        className="flex items-center space-x-2"
                      >
                        <Switch
                          id={`capability-${capability.value}`}
                          checked={filters.capabilities.includes(
                            capability.value,
                          )}
                          onCheckedChange={() =>
                            onFilterChange("capabilities", capability.value)
                          }
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
                      onCheckedChange={() =>
                        onFilterChange(
                          "showOnlyAvailable",
                          !filters.showOnlyAvailable,
                        )
                      }
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

                {/* Show Only Favorites */}
                <div className="pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-only-favorites"
                      checked={filters.showOnlyFavorites}
                      onCheckedChange={() =>
                        onFilterChange(
                          "showOnlyFavorites",
                          !filters.showOnlyFavorites,
                        )
                      }
                      className="scale-75"
                    />
                    <label
                      htmlFor="show-only-favorites"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Show only favorite models
                    </label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectRecommended}
              className="gap-2 hover:scale-105 transition-transform"
            >
              <CheckSquare className="h-4 w-4" />
              Select Recommended
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onUnselectAll}
              className="gap-2 hover:scale-105 transition-transform"
            >
              <Square className="h-4 w-4" />
              Unselect All
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {getActiveFilterCount() > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-background/50 rounded-md p-2 border">
            <span className="text-xs text-muted-foreground font-medium">
              Active:
            </span>
            {filters.providers.map((provider) => (
              <Badge
                key={provider}
                variant="secondary"
                className="text-xs gap-1"
              >
                {
                  FILTER_OPTIONS.providers.find((p) => p.value === provider)
                    ?.label
                }
                <button
                  onClick={() => onFilterChange("providers", provider)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            ))}
            {filters.features.map((feature) => (
              <Badge
                key={feature}
                variant="secondary"
                className="text-xs gap-1"
              >
                {
                  FILTER_OPTIONS.features.find((f) => f.value === feature)
                    ?.label
                }
                <button
                  onClick={() => onFilterChange("features", feature)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            ))}
            {filters.capabilities.map((capability) => (
              <Badge
                key={capability}
                variant="secondary"
                className="text-xs gap-1"
              >
                {
                  FILTER_OPTIONS.capabilities.find(
                    (c) => c.value === capability,
                  )?.label
                }
                <button
                  onClick={() => onFilterChange("capabilities", capability)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            ))}
            {filters.showOnlyAvailable && (
              <Badge variant="secondary" className="text-xs gap-1">
                Available only
                <button
                  onClick={() => onFilterChange("showOnlyAvailable", false)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            )}
            {filters.showOnlyFavorites && (
              <Badge variant="secondary" className="text-xs gap-1">
                Favorites only
                <button
                  onClick={() => onFilterChange("showOnlyFavorites", false)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
      {/* Search Input */}
      <Input
        type="text"
        placeholder="Search models..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
