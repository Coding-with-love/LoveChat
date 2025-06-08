"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface WebSearchState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
}

export const useWebSearchStore = create<WebSearchState>()(
  persist(
    (set, get) => ({
      enabled: false,
      setEnabled: (enabled: boolean) => set({ enabled }),
      toggle: () => set({ enabled: !get().enabled }),
    }),
    {
      name: "web-search-settings",
      version: 1,
    },
  ),
)
