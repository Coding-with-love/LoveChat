import type React from "react";
import type { AIModel } from "@/lib/models"; // Assuming this path is correct

// Represents filter options used in the FilterBar
export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

// Represents the state of all active filters
export interface FilterState {
  providers: string[];
  features: string[];
  capabilities: string[];
  showOnlyAvailable: boolean;
  showOnlyFavorites: boolean;
}

// Base information for each model card
export interface ModelInfo {
  model: AIModel;
  icon: React.ReactNode;
  name: string;
  description: string;
  provider: string;
  features: Array<{
    icon: React.ReactNode;
    label: string;
    color: string;
  }>;
  isEnabled: boolean;
  hasApiKey: boolean;
  isUsingDefaultKey: boolean;
  searchUrl?: string;
}

// Extended information shown in the details dialog
export interface DetailedModelInfo extends ModelInfo {
  detailedDescription: string;
  capabilities: string[];
  limitations: string[];
  bestUseCases: string[];
}
