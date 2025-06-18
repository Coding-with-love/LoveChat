"use client"

import { useState, useEffect } from "react"
import { useUserPreferencesStore } from "@/frontend/stores/UserPreferencesStore"
import { Card, CardContent } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { X, Plus, RefreshCw, Loader2, User, Brain, Bug, Palette, Type } from "lucide-react"
import { toast } from "sonner"
import ThemeSettings from "./ThemeSettings"
import { useAuth } from "./AuthProvider"
import { useTabVisibility } from "@/frontend/hooks/useTabVisibility"

// Available fonts
const UI_FONTS = [
  { name: "Inter", value: "Inter" },
  { name: "Fira Code", value: "Fira Code" },
  { name: "System UI", value: "system-ui" },
  { name: "Roboto", value: "Roboto" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "SF Pro", value: "SF Pro" },
]

const CODE_FONTS = [
  { name: "Fira Mono", value: "Fira Mono" },
  { name: "JetBrains Mono", value: "JetBrains Mono" },
  { name: "Fira Code", value: "Fira Code" },
  { name: "Menlo", value: "Menlo" },
  { name: "Consolas", value: "Consolas" },
  { name: "Source Code Pro", value: "Source Code Pro" },
]

// Common assistant traits
const COMMON_TRAITS = [
  "helpful",
  "creative",
  "precise",
  "concise",
  "friendly",
  "professional",
  "technical",
  "casual",
  "detailed",
  "empathetic",
]

export default function CustomizationSettings() {
  const { user } = useAuth()
  const {
    preferredName,
    occupation,
    assistantTraits,
    customInstructions,
    uiFont,
    codeFont,
    fontSize,
    isLoading,
    setPreferredName,
    setOccupation,
    setAssistantTraits,
    addAssistantTrait,
    removeAssistantTrait,
    setCustomInstructions,
    setUIFont,
    setCodeFont,
    setFontSize,
    loadFromDatabase,
    reset,
  } = useUserPreferencesStore()

  const [newTrait, setNewTrait] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [copiedUserId, setCopiedUserId] = useState(false)

  // Add tab visibility management to prevent stuck loading states
  useTabVisibility({
    onVisible: () => {
      console.log("🔄 CustomizationSettings became visible, checking loading state:", isLoading)
      
      // More aggressive clearing of stuck loading states
      if (isLoading) {
        console.log("🔄 Found loading state in CustomizationSettings, setting up timeout...")
        
        // Give it a short time to complete naturally, then force clear
        setTimeout(() => {
          const currentState = useUserPreferencesStore.getState()
          if (currentState.isLoading) {
            console.warn("⚠️ Force clearing stuck loading state in CustomizationSettings after tab return")
            useUserPreferencesStore.setState({ 
              isLoading: false, 
              hasLoadedFromDB: true 
            })
          }
        }, 1000) // Only wait 1 second before force clearing
      }
      
      // Also check if we never loaded from DB and user exists
      const state = useUserPreferencesStore.getState()
      if (user && !state.hasLoadedFromDB && !state.isLoading) {
        console.log("🔄 Never loaded from DB, attempting load...")
        loadFromDatabase().catch(error => {
          console.warn("Failed to load preferences on tab return:", error)
          // Force mark as loaded to prevent infinite loading
          useUserPreferencesStore.setState({ 
            isLoading: false, 
            hasLoadedFromDB: true 
          })
        })
      }
    },
    refreshStoresOnVisible: false, // Don't trigger additional refreshes
  })

  // Load preferences from database when component mounts and user is available
  useEffect(() => {
    if (user && !isLoading) {
      console.log("🔄 CustomizationSettings: Loading preferences from database for user:", user.id)
      loadFromDatabase()
    }
  }, [user, loadFromDatabase])

  // Add debug logging for preferences changes
  useEffect(() => {
    console.log("📋 CustomizationSettings: Current preferences state:", {
      preferredName,
      occupation,
      assistantTraits,
      customInstructions,
      hasLoadedFromDB: useUserPreferencesStore.getState().hasLoadedFromDB,
      isLoading,
    })
  }, [preferredName, occupation, assistantTraits, customInstructions, isLoading])

  // Apply font settings to the document
  useEffect(() => {
    document.documentElement.style.setProperty("--font-sans", uiFont)
    document.documentElement.style.setProperty("--font-mono", codeFont)

    // Apply font size directly to the document root
    const fontSizeMap = {
      small: "14px",
      medium: "16px",
      large: "18px",
    }

    document.documentElement.style.setProperty("--font-size-base", fontSizeMap[fontSize])

    // Also set the font size directly on the body for immediate effect
    document.body.style.fontSize = fontSizeMap[fontSize]

    console.log(
      `🎨 Font settings applied - UI: ${uiFont}, Code: ${codeFont}, Size: ${fontSize} (${fontSizeMap[fontSize]})`,
    )
  }, [uiFont, codeFont, fontSize])

  // Add a safety timeout to prevent infinite loading screens
  useEffect(() => {
    if (isLoading) {
      const safetyTimeout = setTimeout(() => {
        const currentState = useUserPreferencesStore.getState()
        if (currentState.isLoading) {
          console.warn("⚠️ Safety timeout: forcing CustomizationSettings out of loading state")
          useUserPreferencesStore.setState({ 
            isLoading: false, 
            hasLoadedFromDB: true 
          })
        }
      }, 10000) // 10 second safety timeout

      return () => clearTimeout(safetyTimeout)
    }
  }, [isLoading])

  const handleAddTrait = () => {
    if (!newTrait.trim()) return

    // Don't add duplicates
    if (assistantTraits.includes(newTrait.trim().toLowerCase())) {
      toast.error("This trait is already added")
      return
    }

    addAssistantTrait(newTrait.trim().toLowerCase())
    setNewTrait("")
    toast.success("Trait added")
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      reset()
      toast.success("Settings reset to defaults")
    } catch (error) {
      toast.error("Failed to reset settings")
    } finally {
      setTimeout(() => setIsResetting(false), 500)
    }
  }

  const handleDebugPreferences = () => {
    const state = useUserPreferencesStore.getState()
    console.log("🐛 DEBUG: Full user preferences state:", state)
    alert(`Debug Info (check console for details):
Preferred Name: "${state.preferredName}"
Occupation: "${state.occupation}"
Assistant Traits: [${state.assistantTraits.join(", ")}]
Custom Instructions: "${state.customInstructions}"
Has Loaded from DB: ${state.hasLoadedFromDB}
Is Loading: ${state.isLoading}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your preferences...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* User Identity Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Personal Preferences</h3>
              <p className="text-sm text-muted-foreground">Tell us about yourself for personalized responses</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="group p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50 hover:border-border transition-all duration-200">
              <Label htmlFor="preferred-name" className="text-sm font-semibold text-foreground mb-1.5 block">
                What should LoveChat call you?
              </Label>
              <Input
                id="preferred-name"
                placeholder="Your preferred name"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                className="mb-2 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground/80">
                This name will be used when the assistant addresses you directly.
              </p>
            </div>

            <div className="group p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50 hover:border-border transition-all duration-200">
              <Label htmlFor="occupation" className="text-sm font-semibold text-foreground mb-1.5 block">
                What do you do?
              </Label>
              <Input
                id="occupation"
                placeholder="Your role or occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="mb-2 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground/80">
                Helps the assistant provide more relevant responses to your queries.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assistant Traits Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Assistant Personality</h3>
              <p className="text-sm text-muted-foreground">Shape how your AI assistant responds and behaves</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Preferred Traits Container */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 border border-border/50 backdrop-blur-sm">
              <Label className="text-sm font-semibold text-foreground mb-3 block">Preferred Assistant Traits</Label>
              <div className="flex flex-wrap gap-2 mb-4 min-h-[2rem]">
                {assistantTraits.map((trait) => (
                  <Badge
                    key={trait}
                    variant="secondary"
                    className="px-3 py-1.5 gap-2 group hover:bg-destructive/10 transition-all duration-200 hover:scale-105 bg-primary/10 text-primary border-primary/20"
                  >
                    {trait}
                    <button
                      onClick={() => removeAssistantTrait(trait)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                      aria-label={`Remove ${trait} trait`}
                    >
                      <X className="h-3 w-3 text-muted-foreground group-hover:text-destructive transition-colors" />
                    </button>
                  </Badge>
                ))}
                {assistantTraits.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No traits selected yet</p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder='e.g., "detailed" or "humorous"'
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTrait()
                    }
                  }}
                  className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 focus:ring-2"
                />
                <Button
                  onClick={handleAddTrait}
                  size="icon"
                  variant="outline"
                  disabled={!newTrait.trim()}
                  className="hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Common Traits Container */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-muted/20 to-muted/10 border border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Need ideas? Choose from popular traits below</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_TRAITS.filter((trait) => !assistantTraits.includes(trait)).map((trait) => (
                  <Badge
                    key={trait}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 hover:scale-105 transition-all duration-200 text-xs"
                    onClick={() => {
                      addAssistantTrait(trait)
                      toast.success(`Added "${trait}" trait`)
                    }}
                  >
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50">
              <Label htmlFor="custom-instructions" className="text-sm font-semibold text-foreground mb-2 block">
                Additional Instructions
              </Label>
              <Textarea
                id="custom-instructions"
                placeholder="Add any other details about how you'd like the assistant to respond..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={4}
                className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 resize-none"
              />
              <p className="text-xs text-muted-foreground/80 mt-2">
                These instructions will be included in every conversation with the assistant.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <Palette className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Theme Settings</h3>
              <p className="text-sm text-muted-foreground">Customize your visual experience</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 border border-border/50 backdrop-blur-sm">
            <ThemeSettings />
          </div>
        </CardContent>
      </Card>

      {/* Font Settings Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
              <Type className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Typography</h3>
              <p className="text-sm text-muted-foreground">Customize fonts and text appearance</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50">
              <Label htmlFor="ui-font" className="text-sm font-semibold text-foreground mb-2 block">
                UI Font
              </Label>
              <Select value={uiFont} onValueChange={setUIFont}>
                <SelectTrigger
                  id="ui-font"
                  className="bg-background/50 border-border/50 focus:border-primary/50 shadow-sm"
                >
                  <SelectValue placeholder="Select a font" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl">
                  {UI_FONTS.map((font) => (
                    <SelectItem
                      key={font.value}
                      value={font.value}
                      style={{ fontFamily: font.value }}
                      className="hover:bg-primary/10"
                    >
                      <span style={{ fontFamily: font.value }}>{font.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground/80 mt-2">
                Font used for the user interface and regular text.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50">
              <Label htmlFor="code-font" className="text-sm font-semibold text-foreground mb-2 block">
                Code Font
              </Label>
              <Select value={codeFont} onValueChange={setCodeFont}>
                <SelectTrigger
                  id="code-font"
                  className="bg-background/50 border-border/50 focus:border-primary/50 shadow-sm"
                >
                  <SelectValue placeholder="Select a code font" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl">
                  {CODE_FONTS.map((font) => (
                    <SelectItem
                      key={font.value}
                      value={font.value}
                      style={{ fontFamily: font.value }}
                      className="hover:bg-primary/10"
                    >
                      <span style={{ fontFamily: font.value }}>{font.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground/80 mt-2">Font used for code blocks and monospace text.</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50">
              <Label htmlFor="font-size" className="text-sm font-semibold text-foreground mb-2 block">
                Font Size
              </Label>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={fontSize === "small" ? 0 : fontSize === "medium" ? 1 : 2}
                    onChange={(e) => {
                      const sizes = ["small", "medium", "large"] as const
                      const size = sizes[Number.parseInt(e.target.value)]
                      setFontSize(size)
                      toast.success(`Font size changed to ${size}`)
                    }}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex gap-1">
                    {["Small", "Medium", "Large"].map((label, index) => (
                      <Badge
                        key={label}
                        variant={fontSize === ["small", "medium", "large"][index] ? "default" : "outline"}
                        className="text-xs px-2 py-1"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/80">Adjust the overall text size of the application.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 border border-border/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">Live Preview</h4>
                <Badge variant="outline" className="text-xs">
                  {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)} • {uiFont}
                </Badge>
              </div>
              <div className="space-y-3 transition-all duration-300">
                <p className="text-sm" style={{ fontFamily: uiFont }}>
                  This is how your regular text will look with the <strong>{uiFont}</strong> font.
                </p>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30 overflow-x-auto">
                  <pre className="text-sm" style={{ fontFamily: codeFont }}>
                    <code className="text-muted-foreground">// This is how your code will look with {codeFont}</code>
                    <br />
                    <code className="text-primary">function</code> <code className="text-foreground">example</code>
                    <code className="text-muted-foreground">() {"{"}</code>
                    <br />
                    <code className="text-muted-foreground"> </code>
                    <code className="text-primary">return</code> <code className="text-green-600">"Hello, World!"</code>
                    <code className="text-muted-foreground">;</code>
                    <br />
                    <code className="text-muted-foreground">{"}"}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-4">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="destructive"
            className="gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 hover:border-destructive transition-all duration-200"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reset All Customizations
          </Button>
        </div>
      </div>
    </div>
  )
}
