"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog";
import { Badge } from "@/frontend/components/ui/badge";
import { Switch } from "@/frontend/components/ui/switch";
import { ProviderLogo } from "@/frontend/components/ProviderLogo"; // Assuming path
import { cn } from "@/lib/utils";
import type React from "react";
import type { AIModel } from "@/lib/models";
import type { DetailedModelInfo } from "./types";

interface ModelDetailsDialogProps {
  selectedDetailModelId: AIModel | null; // The ID of the model to show details for
  detailedModelInfo: DetailedModelInfo | null; // The pre-computed detailed info
  onClose: () => void;
  onToggleModel: (model: string) => void;
}

export function ModelDetailsDialog({
  selectedDetailModelId,
  detailedModelInfo,
  onClose,
  onToggleModel,
}: ModelDetailsDialogProps) {
  if (!detailedModelInfo) {
    return null; // Don't render if no data is available
  }

  return (
    <Dialog open={selectedDetailModelId !== null} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ProviderLogo
                provider={detailedModelInfo.provider.toLowerCase() as any} // Type assertion for ProviderLogo
                size="md"
              />
              {detailedModelInfo.name}
              <Badge variant="outline" className="text-xs">
                {detailedModelInfo.provider}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Description */}
            <div>
              <h4 className="font-semibold mb-2">About this model</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {detailedModelInfo.detailedDescription}
              </p>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-semibold mb-3">Features & Capabilities</h4>
              <div className="flex items-center gap-2 flex-wrap">
                {detailedModelInfo.features.map((feature, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className={cn("text-xs gap-1 font-medium", feature.color)}
                  >
                    {feature.icon}
                    {feature.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <h4 className="font-semibold mb-3">Key Capabilities</h4>
              <ul className="space-y-1">
                {detailedModelInfo.capabilities.map((capability, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                    {capability}
                  </li>
                ))}
              </ul>
            </div>

            {/* Best Use Cases */}
            <div>
              <h4 className="font-semibold mb-3">Best Use Cases</h4>
              <ul className="space-y-1">
                {detailedModelInfo.bestUseCases.map((useCase, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                    {useCase}
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations */}
            <div>
              <h4 className="font-semibold mb-3">Limitations</h4>
              <ul className="space-y-1">
                {detailedModelInfo.limitations.map((limitation, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>

            {/* Model Status */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Status:{" "}
                    {detailedModelInfo.hasApiKey
                      ? "Available"
                      : "Requires API Key"}
                  </p>
                  {detailedModelInfo.isUsingDefaultKey && (
                    <p className="text-xs text-muted-foreground">
                      Using default API key
                    </p>
                  )}
                </div>
                <Switch
                  checked={detailedModelInfo.isEnabled}
                  onCheckedChange={() => onToggleModel(detailedModelInfo.model)}
                  disabled={!detailedModelInfo.hasApiKey}
                />
              </div>
            </div>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
}
