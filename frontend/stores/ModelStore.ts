"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { AI_MODELS, getModelConfig, type AIModel, type OllamaModel } from "@/lib/models"

interface ModelState {
  selectedModel: AIModel
  setModel: (model: AIModel) => void
  getModelConfig: () => ReturnType<typeof getModelConfig>
  customModels: OllamaModel[]
  addCustomModel: (model: OllamaModel) => void
  removeCustomModel: (model: OllamaModel) => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: "gemini-2.0-flash-exp" as AIModel, // Set a valid default
      customModels: [] as OllamaModel[],
      setModel: (model: AIModel) => set({ selectedModel: model }),
      getModelConfig: () => getModelConfig(get().selectedModel),
      addCustomModel: (model: OllamaModel) => {
        set((state) => ({
          customModels: [...state.customModels, model],
        }))
      },
      removeCustomModel: (model: OllamaModel) => {
        set((state) => ({
          customModels: state.customModels.filter((m) => m !== model),
          // If the selected model is being removed, switch to default
          selectedModel: state.selectedModel === model ? "gemini-2.0-flash-exp" : state.selectedModel,
        }))
      },
    }),
    {
      name: "model-settings",
      // Add migration to handle old model names
      migrate: (persistedState: any, version: number) => {
        // If the persisted model doesn't exist in current models, reset to default
        if (
          persistedState?.selectedModel &&
          !AI_MODELS.includes(persistedState.selectedModel) &&
          !persistedState.selectedModel.startsWith("ollama:")
        ) {
          console.log("🔄 Migrating old model:", persistedState.selectedModel, "to default")
          return {
            ...persistedState,
            selectedModel: "gemini-2.0-flash-exp",
          }
        }
        return persistedState
      },
      version: 1,
    },
  ),
)
