"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ThemeName = "blue" | "pink" | "green" | "purple" | "yellow" | "teal" | "cloudmist" | "peachmeringue" | "cocoadust" | "frostedsage" | "custom"

export interface ThemeState {
  theme: ThemeName
  customHue: string | null
  setTheme: (theme: ThemeName) => void
  setCustomHue: (hue: string) => void
  reset: () => void
}

export const THEME_NAMES: Record<Exclude<ThemeName, "custom">, string> = {
  blue: "Soft Blue",
  pink: "Blush Petal",
  green: "Mint Whisper",
  purple: "Lavender Haze",
  yellow: "Sunbeam Cream",
  teal: "Dreamy Teal",
  cloudmist: "Cloud Mist",
  peachmeringue: "Peach Meringue",
  cocoadust: "Cocoa Dust",
  frostedsage: "Frosted Sage",
}

type OldState = {
  theme: "blue" | "pink" | "green" | "purple" | "yellow" | "teal" | "custom"
  customHue: string | null
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "blue",
      customHue: null,
      setTheme: (theme) => set({ theme }),
      setCustomHue: (hue) => set({ customHue: hue, theme: "custom" }),
      reset: () => {
        localStorage.removeItem("theme-settings")
        set({ theme: "blue", customHue: null })
      },
    }),
    {
      name: "theme-settings",
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          const oldState = persistedState as OldState
          // If the theme is not in the new set of valid themes, reset to default
          if (!Object.keys(THEME_NAMES).includes(oldState.theme) && oldState.theme !== "custom") {
            return {
              theme: "blue",
              customHue: null,
            }
          }
        }
        return persistedState as ThemeState
      },
    },
  ),
)
