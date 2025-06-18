"use client"

import { useState, useEffect } from "react"
import { useThemeStore, THEME_NAMES, type ThemeName } from "@/frontend/stores/ThemeStore"
import { Card, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Check, RefreshCw, Sun, Moon, MonitorSpeaker, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { Checkbox } from "./ui/checkbox"

// Define theme color palettes
const THEME_PALETTES = {
  pastel: {
    primary: "oklch(0.75 0.08 300)",
    secondary: "oklch(0.2 0.02 300)",
    tertiary: "oklch(0.96 0.01 300)",
    alternate: "oklch(0.75 0.06 290)",
    primaryBg: "oklch(0.99 0.005 300)",
    secondaryBg: "oklch(0.94 0.02 300)",
    primaryText: "oklch(0.15 0.02 300)",
    secondaryText: "oklch(0.4 0.05 300)",
  },
  blue: {
    primary: "oklch(0.55 0.15 240)",
    secondary: "oklch(0.2 0.02 240)",
    tertiary: "oklch(0.96 0.01 240)",
    alternate: "oklch(0.75 0.08 260)",
    primaryBg: "oklch(0.99 0.005 240)",
    secondaryBg: "oklch(0.94 0.02 240)",
    primaryText: "oklch(0.15 0.02 240)",
    secondaryText: "oklch(0.4 0.08 240)",
  },
  pink: {
    primary: "oklch(0.55 0.15 0)",
    secondary: "oklch(0.2 0.02 0)",
    tertiary: "oklch(0.96 0.01 0)",
    alternate: "oklch(0.75 0.08 350)",
    primaryBg: "oklch(0.99 0.005 0)",
    secondaryBg: "oklch(0.94 0.02 0)",
    primaryText: "oklch(0.15 0.02 0)",
    secondaryText: "oklch(0.4 0.08 0)",
  },
  green: {
    primary: "oklch(0.55 0.15 150)",
    secondary: "oklch(0.2 0.02 150)",
    tertiary: "oklch(0.96 0.01 150)",
    alternate: "oklch(0.75 0.08 140)",
    primaryBg: "oklch(0.99 0.005 150)",
    secondaryBg: "oklch(0.94 0.02 150)",
    primaryText: "oklch(0.15 0.02 150)",
    secondaryText: "oklch(0.4 0.08 150)",
  },
  yellow: {
    primary: "oklch(0.55 0.15 90)",
    secondary: "oklch(0.2 0.02 90)",
    tertiary: "oklch(0.96 0.01 90)",
    alternate: "oklch(0.75 0.08 100)",
    primaryBg: "oklch(0.99 0.005 90)",
    secondaryBg: "oklch(0.94 0.02 90)",
    primaryText: "oklch(0.15 0.02 90)",
    secondaryText: "oklch(0.4 0.08 90)",
  },
  teal: {
    primary: "oklch(0.55 0.15 180)",
    secondary: "oklch(0.2 0.02 180)",
    tertiary: "oklch(0.96 0.01 180)",
    alternate: "oklch(0.75 0.08 170)",
    primaryBg: "oklch(0.99 0.005 180)",
    secondaryBg: "oklch(0.94 0.02 180)",
    primaryText: "oklch(0.15 0.02 180)",
    secondaryText: "oklch(0.4 0.08 180)",
  },
  peachmeringue: {
    primary: "oklch(0.55 0.15 45)",
    secondary: "oklch(0.2 0.02 45)",
    tertiary: "oklch(0.96 0.01 45)",
    alternate: "oklch(0.75 0.08 35)",
    primaryBg: "oklch(0.99 0.005 45)",
    secondaryBg: "oklch(0.94 0.02 45)",
    primaryText: "oklch(0.15 0.02 45)",
    secondaryText: "oklch(0.4 0.08 45)",
  },
  charcoal: {
    primary: "oklch(0.55 0.02 240)",
    secondary: "oklch(0.2 0.01 240)",
    tertiary: "oklch(0.96 0.005 240)",
    alternate: "oklch(0.75 0.04 240)",
    primaryBg: "oklch(0.99 0.002 240)",
    secondaryBg: "oklch(0.94 0.01 240)",
    primaryText: "oklch(0.15 0.01 240)",
    secondaryText: "oklch(0.4 0.02 240)",
  },
  neon: {
    primary: "oklch(0.8 0.25 150)",
    secondary: "oklch(0.2 0.05 150)",
    tertiary: "oklch(0.96 0.02 150)",
    alternate: "oklch(0.75 0.2 140)",
    primaryBg: "oklch(0.99 0.01 150)",
    secondaryBg: "oklch(0.94 0.05 150)",
    primaryText: "oklch(0.15 0.05 150)",
    secondaryText: "oklch(0.4 0.15 150)",
  },
  warmth: {
    primary: "oklch(0.65 0.2 45)",
    secondary: "oklch(0.2 0.04 45)",
    tertiary: "oklch(0.96 0.02 45)",
    alternate: "oklch(0.75 0.15 35)",
    primaryBg: "oklch(0.99 0.01 45)",
    secondaryBg: "oklch(0.94 0.04 45)",
    primaryText: "oklch(0.15 0.04 45)",
    secondaryText: "oklch(0.4 0.12 45)",
  },
  jewel: {
    primary: "oklch(0.45 0.15 140)",
    secondary: "oklch(0.2 0.03 140)",
    tertiary: "oklch(0.96 0.01 140)",
    alternate: "oklch(0.75 0.12 130)",
    primaryBg: "oklch(0.99 0.005 140)",
    secondaryBg: "oklch(0.94 0.03 140)",
    primaryText: "oklch(0.15 0.03 140)",
    secondaryText: "oklch(0.4 0.08 140)",
  },
  contrast: {
    primary: "oklch(0.65 0.25 25)",
    secondary: "oklch(0.2 0.05 25)",
    tertiary: "oklch(0.96 0.02 25)",
    alternate: "oklch(0.75 0.2 15)",
    primaryBg: "oklch(0.99 0.01 25)",
    secondaryBg: "oklch(0.94 0.05 25)",
    primaryText: "oklch(0.15 0.05 25)",
    secondaryText: "oklch(0.4 0.15 25)",
  },
}

// Ordered theme names with pastel first
const ORDERED_THEME_NAMES = ["pastel", "blue", "pink", "green", "yellow", "teal", "peachmeringue", "charcoal", "neon", "warmth", "jewel", "contrast"] as const

// Color swatch component
function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded border border-border/20"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

// Color wheel component
function ColorWheel({ selectedHue, onHueChange }: { selectedHue: number; onHueChange: (hue: number) => void }) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const x = event.clientX - rect.left - centerX
    const y = event.clientY - rect.top - centerY
    
    // Calculate angle from center
    let angle = Math.atan2(y, x) * (180 / Math.PI)
    if (angle < 0) angle += 360
    
    onHueChange(Math.round(angle))
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 1) { // Only if left mouse button is pressed
      handleClick(event)
    }
  }

  return (
    <div className="relative w-40 h-40 mx-auto">
      <div
        className="w-full h-full rounded-full cursor-pointer border-4 border-white shadow-lg"
        style={{
          background: `conic-gradient(
            hsl(0, 70%, 60%), 
            hsl(60, 70%, 60%), 
            hsl(120, 70%, 60%), 
            hsl(180, 70%, 60%), 
            hsl(240, 70%, 60%), 
            hsl(300, 70%, 60%), 
            hsl(0, 70%, 60%)
          )`
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />
      
      {/* Inner white circle for better contrast */}
      <div 
        className="absolute inset-4 rounded-full bg-white/20 pointer-events-none"
      />
      
      {/* Selected hue indicator */}
      <div
        className="absolute w-5 h-5 bg-white border-3 border-gray-800 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg z-10 pointer-events-none"
        style={{
          left: `${50 + 40 * Math.cos(selectedHue * Math.PI / 180)}%`,
          top: `${50 + 40 * Math.sin(selectedHue * Math.PI / 180)}%`,
        }}
      />
    </div>
  )
}

// Function to generate complementary colors based on primary hue
function generatePaletteFromHue(hue: number) {
  return {
    primary: `oklch(0.55 0.15 ${hue})`,
    secondary: `oklch(0.2 0.02 ${hue})`,
    tertiary: `oklch(0.96 0.01 ${hue})`,
    alternate: `oklch(0.75 0.08 ${(hue + 20) % 360})`,
    primaryBg: `oklch(0.99 0.005 ${hue})`,
    secondaryBg: `oklch(0.94 0.02 ${hue})`,
    primaryText: `oklch(0.15 0.02 ${hue})`,
    secondaryText: `oklch(0.4 0.08 ${hue})`,
  }
}

// Theme card component
function ThemeCard({
  themeName,
  displayName,
  isSelected,
  onSelect,
  palette,
}: {
  themeName: string
  displayName: string
  isSelected: boolean
  onSelect: () => void
  palette: any
}) {
  return (
    <Card className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`} onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <Checkbox checked={isSelected} className="mt-1" />
          <div className="flex-1">
            <h3 className="font-medium text-base">{displayName}</h3>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <ColorSwatch color={palette.primary} label="Primary" />
          <ColorSwatch color={palette.secondary} label="Secondary" />
          <ColorSwatch color={palette.tertiary} label="Tertiary" />
          <ColorSwatch color={palette.alternate} label="Alternate" />
          <ColorSwatch color={palette.primaryBg} label="Primary Background" />
          <ColorSwatch color={palette.secondaryBg} label="Secondary Background" />
          <ColorSwatch color={palette.primaryText} label="Primary Text" />
          <ColorSwatch color={palette.secondaryText} label="Secondary Text" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function ThemeSettings() {
  const { theme, customHue, setTheme, setCustomHue, reset } = useThemeStore()
  const { theme: systemTheme, setTheme: setSystemTheme } = useTheme()
  const [customHueInput, setCustomHueInput] = useState(Number(customHue) || 240)
  const [isApplying, setIsApplying] = useState(false)
  const [showAllThemes, setShowAllThemes] = useState(false)

  // Show first 4 themes initially
  const visibleThemes = showAllThemes ? ORDERED_THEME_NAMES : ORDERED_THEME_NAMES.slice(0, 4)
  const hasMoreThemes = ORDERED_THEME_NAMES.length > 4

  // Update local state when store changes
  useEffect(() => {
    if (customHue) {
      setCustomHueInput(Number(customHue))
    }
  }, [customHue])

  const handleThemeChange = (themeName: ThemeName) => {
    setTheme(themeName)
    toast.success(`Theme changed to ${THEME_NAMES[themeName as Exclude<ThemeName, "custom">] || "Custom"}`)
  }

  const handleCustomHueChange = (hue: number) => {
    setCustomHueInput(hue)
    setCustomHue(hue.toString())
    if (theme === "custom") {
      toast.success("Custom theme updated")
    }
  }

  const handleCustomSubmit = () => {
    try {
      setIsApplying(true)
      setCustomHue(customHueInput.toString())
      setTheme("custom")
      toast.success("Custom theme applied")
    } catch (error) {
      toast.error("Failed to apply custom theme")
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* App theme toggle */}
      <div className="flex items-center justify-end">
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={systemTheme === "light" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSystemTheme("light")}
            className="rounded-md px-3"
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            variant={systemTheme === "dark" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSystemTheme("dark")}
            className="rounded-md px-3"
          >
            <Moon className="h-4 w-4" />
          </Button>
          <Button
            variant={systemTheme === "system" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSystemTheme("system")}
            className="rounded-md px-3"
          >
            <MonitorSpeaker className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current Theme Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Theme</h3>
        {theme !== "custom" && (
          <ThemeCard
            themeName={theme}
            displayName={THEME_NAMES[theme as Exclude<ThemeName, "custom">]}
            isSelected={true}
            onSelect={() => {}}
            palette={THEME_PALETTES[theme as keyof typeof THEME_PALETTES]}
          />
        )}

        {theme === "custom" && (
          <Card className="ring-2 ring-primary">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <Checkbox checked={true} className="mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium text-base">Custom Theme</h3>
                </div>
              </div>

              <div className="space-y-4">
                <ColorWheel
                  selectedHue={customHueInput}
                  onHueChange={handleCustomHueChange}
                />
                
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(generatePaletteFromHue(customHueInput)).map(([key, color]) => (
                    <ColorSwatch 
                      key={key} 
                      color={color} 
                      label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} 
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="360"
                    value={customHueInput}
                    onChange={(e) => setCustomHueInput(Number(e.target.value))}
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Available Themes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Available Themes</h3>
          <span className="text-sm text-muted-foreground">
            {ORDERED_THEME_NAMES.length + 1} themes available
          </span>
        </div>
        
        <div className="space-y-3">
          {visibleThemes.map((themeName) => (
            <ThemeCard
              key={themeName}
              themeName={themeName}
              displayName={THEME_NAMES[themeName]}
              isSelected={theme === themeName}
              onSelect={() => handleThemeChange(themeName)}
              palette={THEME_PALETTES[themeName]}
            />
          ))}

          {/* Custom Theme Option */}
          <ThemeCard
            themeName="custom"
            displayName="Custom Theme"
            isSelected={theme === "custom"}
            onSelect={() => handleThemeChange("custom")}
            palette={generatePaletteFromHue(customHueInput)}
          />
          
          {/* View More Button at bottom */}
          {hasMoreThemes && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllThemes(!showAllThemes)}
                className="flex items-center gap-2"
              >
                {showAllThemes ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>View More Themes</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            reset()
            toast.success("Theme settings reset to default")
          }}
        >
          Reset to Default
        </Button>
      </div>
    </div>
  )
}
