"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ThemeName = "blue" | "pink" | "green" | "yellow" | "teal" | "peachmeringue" | "charcoal" | "neon" | "warmth" | "pastel" | "jewel" | "contrast" | "custom"

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
  yellow: "Sunbeam Cream",
  teal: "Dreamy Teal",
  peachmeringue: "Peach Meringue",
  charcoal: "Charcoal Black",
  neon: "Neon Cyber",
  warmth: "Cozy Warmth",
  pastel: "Dreamy Pastels",
  jewel: "Deep Jewels",
  contrast: "High Contrast",
}

type OldState = {
  theme: "blue" | "pink" | "green" | "purple" | "yellow" | "teal" | "custom"
  customHue: string | null
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "pastel",
      customHue: null,
      setTheme: (theme) => set({ theme }),
      setCustomHue: (hue) => set({ customHue: hue, theme: "custom" }),
      reset: () => {
        localStorage.removeItem("theme-settings")
        set({ theme: "pastel", customHue: null })
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
              theme: "pastel",
              customHue: null,
            }
          }
        }
        // Handle removal of deprecated themes
        const state = persistedState as ThemeState
        const deprecatedThemes = ["purple", "cloudmist", "cocoadust", "frostedsage"]
        if (deprecatedThemes.includes(state.theme)) {
          return {
            ...state,
            theme: "pastel",
          }
        }
        return state
      },
    },
  ),
)
