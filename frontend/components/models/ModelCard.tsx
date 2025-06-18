"use client";

import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Switch } from "@/frontend/components/ui/switch";
import { ProviderLogo } from "@/frontend/components/ProviderLogo"; // Assuming path
import {
  Key,
  Globe,
  Star,
  Shield,
  Search,
  Sparkles,
  Eye,
  FileText,
  Lightbulb,
  Zap,
} from "lucide-react"; // Icons used
import { cn } from "@/lib/utils"; // Utility for class names
import type React from "react";
import type { ModelInfo } from "./types";

interface ModelCardProps {
  modelInfo: ModelInfo;
  favoriteModels: string[]; // To check favorite status
  onToggleModel: (model: string) => void;
  onToggleFavorite: (model: string) => void;
  onShowDetails: (model: string) => void;
}

export function ModelCard({
  modelInfo,
  favoriteModels,
  onToggleModel,
  onToggleFavorite,
  onShowDetails,
}: ModelCardProps) {
  const isFavorite = favoriteModels.includes(modelInfo.model);

  // Map of feature labels to their specific icons and colors for rendering badges
  const featureIconMap: Record<
    string,
    { icon: React.ReactNode; color: string }
  > = {
    Search: {
      icon: <Search className="h-3 w-3" />,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    Thinking: {
      icon: <Sparkles className="h-3 w-3" />,
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
    Vision: {
      icon: <Eye className="h-3 w-3" />,
      color: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    PDFs: {
      icon: <FileText className="h-3 w-3" />,
      color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    },
    Reasoning: {
      icon: <Lightbulb className="h-3 w-3" />,
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    },
    Fast: {
      icon: <Zap className="h-3 w-3" />,
      color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    },
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-6 transition-all duration-300",
        modelInfo.isEnabled && "ring-2 ring-primary/20 bg-primary/5",
        "hover:shadow-lg hover:border-primary/20",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Model Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <ProviderLogo
                  provider={modelInfo.provider.toLowerCase() as any} // Type assertion for ProviderLogo
                  size="md"
                />
                <h4 className="text-xl font-bold text-foreground truncate">
                  {modelInfo.name}
                </h4>
                {isFavorite && (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  >
                    <Star className="h-3 w-3 fill-current" />
                    Favorite
                  </Badge>
                )}
                {/* Example: 'Delta' badge */}
                {modelInfo.name.includes("🔺") && (
                  <Badge variant="secondary" className="text-xs">
                    Delta
                  </Badge>
                )}
              </div>
              <div className="ml-12 space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {modelInfo.description}
                </p>
                <button
                  onClick={() => onShowDetails(modelInfo.model)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Show more details →
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="flex items-center gap-3 flex-wrap ml-12">
              {/* Core Features (Search, Vision, PDFs) */}
              <div className="flex items-center gap-1">
                {modelInfo.features
                  .filter((f) => ["Search", "Vision", "PDFs"].includes(f.label))
                  .map((feature) => (
                    <Badge
                      key={feature.label}
                      variant="secondary"
                      className={cn(
                        "text-xs gap-1 font-medium",
                        featureIconMap[feature.label]?.color,
                      )}
                    >
                      {featureIconMap[feature.label]?.icon}
                      {feature.label}
                    </Badge>
                  ))}
              </div>

              {/* Performance Features (Fast, Thinking, Reasoning) */}
              <div className="flex items-center gap-1">
                {modelInfo.features
                  .filter((f) =>
                    ["Fast", "Thinking", "Reasoning"].includes(f.label),
                  )
                  .map((feature) => (
                    <Badge
                      key={feature.label}
                      variant="outline"
                      className={cn(
                        "text-xs gap-1",
                        featureIconMap[feature.label]?.color,
                      )}
                    >
                      {featureIconMap[feature.label]?.icon}
                      {feature.label}
                    </Badge>
                  ))}
              </div>

              {/* Status Indicators */}
              {modelInfo.isUsingDefaultKey && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1 border-green-500/30 text-green-600 bg-green-50/50 dark:bg-green-950/10 opacity-75"
                >
                  <Shield className="h-3 w-3" />
                  Default key
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {modelInfo.searchUrl && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <a
                href={modelInfo.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="h-4 w-4" />
                Search URL
              </a>
            </Button>
          )}

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite(modelInfo.model)}
            className={cn(
              "gap-2 transition-all duration-200",
              isFavorite
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-muted-foreground hover:text-yellow-500",
            )}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Star
              className={cn(
                "h-4 w-4 transition-all duration-200",
                isFavorite && "fill-current",
              )}
            />
          </Button>

          <Switch
            checked={modelInfo.isEnabled}
            onCheckedChange={() => onToggleModel(modelInfo.model)}
            disabled={!modelInfo.hasApiKey}
          />
        </div>
      </div>

      {/* API Key Required Overlay */}
      {!modelInfo.hasApiKey && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-2">
            <Key className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">API Key Required</p>
            <p className="text-xs text-muted-foreground">
              Add your {modelInfo.provider} API key in the API Keys tab
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
