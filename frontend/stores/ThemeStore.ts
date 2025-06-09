"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ThemeName = "blue" | "pink" | "green" | "purple" | "yellow" | "teal" | "custom"

export interface ThemeState {
  theme: ThemeName
  customHue: string | null
  setTheme: (theme: ThemeName) => void
  setCustomHue: (hue: string) => void
}

export const THEME_NAMES: Record<Exclude<ThemeName, "custom">, string> = {
  blue: "Soft Blue",
  pink: "Blush Petal",
  green: "Mint Whisper",
  purple: "Lavender Haze",
  yellow: "Sunbeam Cream",
  teal: "Dreamy Teal",
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "blue",
      customHue: null,
      setTheme: (theme) => set({ theme }),
      setCustomHue: (hue) => set({ customHue: hue, theme: "custom" }),
    }),
    {
      name: "theme-settings",
    },
  ),
)
