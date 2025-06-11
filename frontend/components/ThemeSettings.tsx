"use client"

import { useState, useEffect } from "react"
import { useThemeStore, THEME_NAMES, type ThemeName } from "@/frontend/stores/ThemeStore"
import { Card, CardContent } from "./ui/card"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Check, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export default function ThemeSettings() {
  const { theme, customHue, setTheme, setCustomHue, reset } = useThemeStore()
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(theme)
  const [customHueInput, setCustomHueInput] = useState(customHue || "240")
  const [isApplying, setIsApplying] = useState(false)

  // Update local state when store changes
  useEffect(() => {
    setSelectedTheme(theme)
    if (customHue) {
      setCustomHueInput(customHue)
    }
  }, [theme, customHue])

  const handleThemeChange = (value: ThemeName) => {
    setSelectedTheme(value)
    setTheme(value)
    toast.success(`Theme changed to ${THEME_NAMES[value as Exclude<ThemeName, "custom">] || "Custom"}`)
  }

  const handleCustomSubmit = () => {
    try {
      setIsApplying(true)

      // Validate hue value (should be a number between 0 and 360)
      const hue = Number.parseInt(customHueInput)
      if (isNaN(hue) || hue < 0 || hue > 360) {
        throw new Error("Invalid hue value")
      }

      setCustomHue(customHueInput)
      toast.success("Custom theme applied")
    } catch (error) {
      toast.error("Invalid hue value. Please enter a number between 0 and 360.")
    } finally {
      setIsApplying(false)
    }
  }

  const renderThemePreview = (themeName: Exclude<ThemeName, "custom">) => {
    // Map theme names to their primary colors for preview
    const themeColors = {
      blue: "oklch(0.55 0.15 240)",
      pink: "oklch(0.55 0.15 0)",
      green: "oklch(0.55 0.15 150)",
      purple: "oklch(0.55 0.15 300)",
      yellow: "oklch(0.55 0.15 90)",
      teal: "oklch(0.55 0.15 180)",
      cloudmist: "oklch(0.55 0.15 210)",
      peachmeringue: "oklch(0.55 0.15 45)",
      cocoadust: "oklch(0.55 0.15 30)",
      frostedsage: "oklch(0.55 0.15 135)",
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: themeColors[themeName] }} />
        <span>{THEME_NAMES[themeName]}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Color Theme</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a color theme for your application. The theme will work with both light and dark modes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            reset()
            toast.success("Theme settings reset to default")
          }}
        >
          Reset to Default
        </Button>
      </div>

      <RadioGroup value={selectedTheme} onValueChange={handleThemeChange as (value: string) => void}>
        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(THEME_NAMES) as Array<Exclude<ThemeName, "custom">>).map((themeName) => (
            <div key={themeName} className="flex items-start space-x-2">
              <RadioGroupItem value={themeName} id={`theme-${themeName}`} />
              <Label htmlFor={`theme-${themeName}`} className="flex-1 cursor-pointer">
                {renderThemePreview(themeName)}
              </Label>
            </div>
          ))}

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="custom" id="theme-custom" />
            <Label htmlFor="theme-custom" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
                <span>Custom</span>
              </div>
            </Label>
          </div>
        </div>
      </RadioGroup>

      {selectedTheme === "custom" && (
        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-hue">Hue Value (0-360)</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="custom-hue"
                    type="number"
                    min="0"
                    max="360"
                    placeholder="240"
                    value={customHueInput}
                    onChange={(e) => setCustomHueInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleCustomSubmit} size="sm" disabled={isApplying}>
                    {isApplying ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Examples: 0 for red/pink, 60 for yellow, 120 for green, 180 for teal, 240 for blue, 300 for purple
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
