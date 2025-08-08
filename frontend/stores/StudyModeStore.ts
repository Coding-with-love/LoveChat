"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface StudyModeState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
}

export const useStudyModeStore = create<StudyModeState>()(
  persist(
    (set, get) => ({
      enabled: false,
      setEnabled: (enabled: boolean) => set({ enabled }),
      toggle: () => set({ enabled: !get().enabled }),
    }),
    {
      name: "study-mode-settings",
      version: 1,
    },
  ),
)
