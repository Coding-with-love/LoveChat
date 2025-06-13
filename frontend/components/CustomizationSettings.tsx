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
import { X, Plus, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import ThemeSettings from "./ThemeSettings"
import { useAuth } from "./AuthProvider"

// Available fonts
const UI_FONTS = [
  { name: "Inter", value: "Inter" },
  { name: "System UI", value: "system-ui" },
  { name: "Roboto", value: "Roboto" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "SF Pro", value: "SF Pro" },
]

const CODE_FONTS = [
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
      isLoading
    })
  }, [preferredName, occupation, assistantTraits, customInstructions, isLoading])

  // Apply font settings to the document
  useEffect(() => {
    document.documentElement.style.setProperty("--font-sans", uiFont)
    document.documentElement.style.setProperty("--font-mono", codeFont)

    // Apply font size
    const fontSizeMap = {
      small: {
        base: "14px",
        scale: "0.95",
      },
      medium: {
        base: "16px",
        scale: "1",
      },
      large: {
        base: "18px",
        scale: "1.05",
      },
    }

    document.documentElement.style.setProperty("--font-size-base", fontSizeMap[fontSize].base)
    document.documentElement.style.setProperty("--font-size-scale", fontSizeMap[fontSize].scale)
  }, [uiFont, codeFont, fontSize])

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
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Personal Preferences</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preferred-name">What should LoveChat call you?</Label>
              <Input
                id="preferred-name"
                placeholder="Your preferred name"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This name will be used when the assistant addresses you directly.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">What do you do?</Label>
              <Input
                id="occupation"
                placeholder="Your role or occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Helps the assistant provide more relevant responses to your queries.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assistant Traits Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Assistant Personality</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preferred Assistant Traits</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {assistantTraits.map((trait) => (
                  <Badge
                    key={trait}
                    variant="secondary"
                    className="px-2 py-1 gap-1 group hover:bg-destructive/10 transition-colors"
                  >
                    {trait}
                    <button
                      onClick={() => removeAssistantTrait(trait)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                      aria-label={`Remove ${trait} trait`}
                    >
                      <X className="h-3 w-3 text-muted-foreground group-hover:text-destructive transition-colors" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a trait..."
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTrait()
                    }
                  }}
                />
                <Button onClick={handleAddTrait} size="icon" variant="outline" disabled={!newTrait.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Common traits:</p>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TRAITS.filter((trait) => !assistantTraits.includes(trait)).map((trait) => (
                    <Badge
                      key={trait}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
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
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="custom-instructions">Additional Instructions</Label>
              <Textarea
                id="custom-instructions"
                placeholder="Add any other details about how you'd like the assistant to respond..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be included in every conversation with the assistant.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Theme Settings</h3>
          <ThemeSettings />
        </CardContent>
      </Card>

      {/* Font Settings Section */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Typography</h3>

          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="ui-font">UI Font</Label>
              <Select value={uiFont} onValueChange={setUIFont}>
                <SelectTrigger id="ui-font">
                  <SelectValue placeholder="Select a font" />
                </SelectTrigger>
                <SelectContent>
                  {UI_FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Font used for the user interface and regular text.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code-font">Code Font</Label>
              <Select value={codeFont} onValueChange={setCodeFont}>
                <SelectTrigger id="code-font">
                  <SelectValue placeholder="Select a code font" />
                </SelectTrigger>
                <SelectContent>
                  {CODE_FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      <span style={{ fontFamily: font.value }}>{font.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Font used for code blocks and monospace text.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="font-size">Font Size</Label>
              <Select value={fontSize} onValueChange={(value) => setFontSize(value as "small" | "medium" | "large")}>
                <SelectTrigger id="font-size">
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Adjust the overall text size of the application.</p>
            </div>

            <div className="pt-2">
              <div className="p-4 rounded-md border bg-card">
                <h4 className="text-sm font-medium mb-2">Preview</h4>
                <p className="mb-2" style={{ fontFamily: uiFont }}>
                  This is how your regular text will look with the {uiFont} font.
                </p>
                <pre className="p-2 rounded bg-muted overflow-x-auto" style={{ fontFamily: codeFont }}>
                  <code>// This is how your code will look with {codeFont}</code>
                  <br />
                  <code>function example() {"{"}</code>
                  <br />
                  <code> return "Hello, World!";</code>
                  <br />
                  <code>{"}"}</code>
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Reset All Customizations
        </Button>
      </div>

      {/* Debug Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDebugPreferences}
          disabled={isResetting}
        >
          {isResetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Debug Preferences
        </Button>
      </div>
    </div>
  )
}
