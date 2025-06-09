"use client"

import type React from "react"
import { useEffect } from "react"
import { useThemeStore } from "@/frontend/stores/ThemeStore"

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, customHue } = useThemeStore()

  useEffect(() => {
    // For debugging
    console.log("ThemeProvider: Applying theme", { theme, customHue })

    // First, remove any existing theme classes
    document.documentElement.classList.remove(
      "theme-blue",
      "theme-pink",
      "theme-green",
      "theme-purple",
      "theme-yellow",
      "theme-teal",
      "theme-custom",
    )

    // Add the current theme class
    document.documentElement.classList.add(`theme-${theme}`)
    console.log("Applied theme class:", `theme-${theme}`)
    console.log("Current classes:", document.documentElement.className)

    // If it's a custom theme, apply custom CSS variables
    if (theme === "custom" && customHue) {
      const style = document.createElement("style")
      style.textContent = `
        :root.theme-custom {
          --primary: oklch(0.55 0.15 ${customHue});
          --background: oklch(0.99 0.005 ${customHue});
          --card: oklch(0.99 0.005 ${customHue});
          --popover: oklch(0.99 0.005 ${customHue});
          --secondary: oklch(0.96 0.01 ${customHue});
          --muted: oklch(0.96 0.01 ${customHue});
          --accent: oklch(0.94 0.02 ${customHue});
          --border: oklch(0.9 0.015 ${customHue});
          --input: oklch(0.9 0.015 ${customHue});
          --ring: oklch(0.55 0.15 ${customHue});
          --sidebar: oklch(0.98 0.008 ${customHue});
          --sidebar-primary: oklch(0.55 0.15 ${customHue});
          --sidebar-accent: oklch(0.94 0.02 ${customHue});
          --sidebar-border: oklch(0.9 0.015 ${customHue});
          --sidebar-ring: oklch(0.55 0.15 ${customHue});
          --chart-1: oklch(0.6 0.15 ${customHue});
          --chart-2: oklch(0.65 0.12 ${Number(customHue) - 20});
          --chart-3: oklch(0.7 0.1 ${Number(customHue) + 20});
          --chart-4: oklch(0.55 0.18 ${Number(customHue) - 10});
          --chart-5: oklch(0.75 0.08 ${Number(customHue) + 10});
        }
        
        .dark.theme-custom {
          --primary: oklch(0.65 0.18 ${customHue});
          --background: oklch(0.12 0.02 ${customHue});
          --card: oklch(0.18 0.025 ${customHue});
          --popover: oklch(0.18 0.025 ${customHue});
          --secondary: oklch(0.22 0.03 ${customHue});
          --muted: oklch(0.22 0.03 ${customHue});
          --accent: oklch(0.25 0.035 ${customHue});
          --border: oklch(0.3 0.04 ${customHue});
          --input: oklch(0.25 0.035 ${customHue});
          --ring: oklch(0.65 0.18 ${customHue});
          --sidebar: oklch(0.15 0.025 ${customHue});
          --sidebar-primary: oklch(0.65 0.18 ${customHue});
          --sidebar-accent: oklch(0.25 0.035 ${customHue});
          --sidebar-border: oklch(0.3 0.04 ${customHue});
          --sidebar-ring: oklch(0.65 0.18 ${customHue});
          --chart-1: oklch(0.6 0.18 ${customHue});
          --chart-2: oklch(0.65 0.15 ${Number(customHue) - 20});
          --chart-3: oklch(0.7 0.12 ${Number(customHue) + 20});
          --chart-4: oklch(0.55 0.2 ${Number(customHue) - 10});
          --chart-5: oklch(0.75 0.1 ${Number(customHue) + 10});
        }
      `

      // Remove any existing custom theme style
      const existingStyle = document.getElementById("custom-theme")
      if (existingStyle) {
        existingStyle.remove()
      }

      style.id = "custom-theme"
      document.head.appendChild(style)
      console.log("Applied custom theme style")
    }
  }, [theme, customHue])

  return <>{children}</>
}
