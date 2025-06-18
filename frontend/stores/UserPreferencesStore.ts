"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getUserPreferences, saveUserPreferences } from "@/lib/supabase/queries"
import { toast } from "sonner"

export interface UserPreferences {
  // User identity
  preferredName: string
  occupation: string

  // Chat assistant preferences
  assistantTraits: string[]
  customInstructions: string

  // Font preferences
  uiFont: string
  codeFont: string
  fontSize: "small" | "medium" | "large"
}

interface UserPreferencesState extends UserPreferences {
  isLoading: boolean
  hasLoadedFromDB: boolean

  setPreferredName: (name: string) => void
  setOccupation: (occupation: string) => void
  setAssistantTraits: (traits: string[]) => void
  addAssistantTrait: (trait: string) => void
  removeAssistantTrait: (trait: string) => void
  setCustomInstructions: (instructions: string) => void
  setUIFont: (font: string) => void
  setCodeFont: (font: string) => void
  setFontSize: (size: "small" | "medium" | "large") => void

  // Database functions
  loadFromDatabase: () => Promise<void>
  reset: () => void
}

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredName: "",
  occupation: "",
  assistantTraits: ["helpful", "creative", "precise"],
  customInstructions: "",
  uiFont: "Inter",
  codeFont: "JetBrains Mono",
  fontSize: "medium",
}

// Debounce function to avoid too many database calls
let saveTimeout: NodeJS.Timeout | null = null

const debouncedSave = (saveFunction: () => Promise<void>) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    saveFunction().catch((error) => {
      console.error("Failed to save preferences:", error)
      // Don't show toast for every failed save to avoid spam
    })
  }, 1000) // Save after 1 second of no changes
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFERENCES,
      isLoading: false,
      hasLoadedFromDB: false,

      setPreferredName: (preferredName) => {
        set({ preferredName })
        if (get().hasLoadedFromDB) {
          debouncedSave(async () => {
            const state = get()
            await saveUserPreferences({
              preferred_name: state.preferredName,
              occupation: state.occupation,
              assistant_traits: state.assistantTraits,
              custom_instructions: state.customInstructions,
              ui_font: state.uiFont,
              code_font: state.codeFont,
              font_size: state.fontSize,
            })
          })
        }
      },

      setOccupation: (occupation) => {
        set({ occupation })
        if (get().hasLoadedFromDB) {
          debouncedSave(async () => {
            const state = get()
            await saveUserPreferences({
              preferred_name: state.preferredName,
              occupation: state.occupation,
              assistant_traits: state.assistantTraits,
              custom_instructions: state.customInstructions,
              ui_font: state.uiFont,
              code_font: state.codeFont,
              font_size: state.fontSize,
            })
          })
        }
      },

      setAssistantTraits: (assistantTraits) => {
        set({ assistantTraits })
        if (get().hasLoadedFromDB) {
          debouncedSave(async () => {
            const state = get()
            await saveUserPreferences({
              preferred_name: state.preferredName,
              occupation: state.occupation,
              assistant_traits: state.assistantTraits,
              custom_instructions: state.customInstructions,
              ui_font: state.uiFont,
              code_font: state.codeFont,
              font_size: state.fontSize,
            })
          })
        }
      },

      addAssistantTrait: (trait) => {
        const currentTraits = get().assistantTraits
        if (!currentTraits.includes(trait)) {
          const newTraits = [...currentTraits, trait]
          set({ assistantTraits: newTraits })
          if (get().hasLoadedFromDB) {
            debouncedSave(async () => {
              const state = get()
              await saveUserPreferences({
                preferred_name: state.preferredName,
                occupation: state.occupation,
                assistant_traits: state.assistantTraits,
                custom_instructions: state.customInstructions,
                ui_font: state.uiFont,
                code_font: state.codeFont,
                font_size: state.fontSize,
              })
            })
          }
        }
      },

      removeAssistantTrait: (trait) => {
        const newTraits = get().assistantTraits.filter((t) => t !== trait)
        set({ assistantTraits: newTraits })
        if (get().hasLoadedFromDB) {
          debouncedSave(async () => {
            const state = get()
            await saveUserPreferences({
              preferred_name: state.preferredName,
              occupation: state.occupation,
              assistant_traits: state.assistantTraits,
              custom_instructions: state.customInstructions,
              ui_font: state.uiFont,
              code_font: state.codeFont,
              font_size: state.fontSize,
            })
          })
        }
      },

      setCustomInstructions: (customInstructions) => {
        set({ customInstructions })
        if (get().hasLoadedFromDB) {
          debouncedSave(async () => {
            const state = get()
            await saveUserPreferences({
              preferred_name: state.preferredName,
              occupation: state.occupation,
              assistant_traits: state.assistantTraits,
              custom_instructions: state.customInstructions,
              ui_font: state.uiFont,
              code_font: state.codeFont,
              font_size: state.fontSize,
            })
          })
        }
      },

      setUIFont: (uiFont) => {
        set({ uiFont })
        if (get().hasLoadedFromDB) {
          debouncedSave(async () => {
            const state = get()
            await saveUserPreferences({
              preferred_name: state.preferredName,
              occupation: state.occupation,
              assistant_traits: state.assistantTraits,
              custom_instructions: state.customInstructions,
              ui_font: state.uiFont,
              code_font: state.codeFont,
              font_size: state.fontSize,
            })
          })
        }
      },

      setCodeFont: (codeFont) => {
        set({ codeFont })
        if (get().hasLoadedFromDB) {
          debouncedSave(async () => {
            const state = get()
            await saveUserPreferences({
              preferred_name: state.preferredName,
              occupation: state.occupation,
              assistant_traits: state.assistantTraits,
              custom_instructions: state.customInstructions,
              ui_font: state.uiFont,
              code_font: state.codeFont,
              font_size: state.fontSize,
            })
          })
        }
      },

      setFontSize: (fontSize) => {
        set({ fontSize })
        if (get().hasLoadedFromDB) {
          debouncedSave(async () => {
            const state = get()
            await saveUserPreferences({
              preferred_name: state.preferredName,
              occupation: state.occupation,
              assistant_traits: state.assistantTraits,
              custom_instructions: state.customInstructions,
              ui_font: state.uiFont,
              code_font: state.codeFont,
              font_size: state.fontSize,
            })
          })
        }
      },

      loadFromDatabase: async () => {
        // Prevent concurrent loads and add timeout protection
        const currentState = get()
        if (currentState.isLoading) {
          console.log("📥 loadFromDatabase already in progress, skipping...")
          return
        }

        // Set loading timeout to prevent stuck states
        const loadingTimeout = setTimeout(() => {
          const state = get()
          if (state.isLoading) {
            console.warn("⚠️ UserPreferences loadFromDatabase timeout - clearing loading state")
            set({ isLoading: false, hasLoadedFromDB: true })
          }
        }, 8000) // Increased to 8 second timeout

        try {
          set({ isLoading: true })
          console.log("📥 Attempting to load preferences from database...")
          
          // Try to load preferences with a more graceful timeout approach
          let dbPreferences = null
          
          try {
            // Create a promise that resolves to null on timeout instead of rejecting
            const dbPromise = getUserPreferences()
            const timeoutPromise = new Promise<null>((resolve) => 
              setTimeout(() => {
                console.log("📥 Database query taking longer than expected, continuing with defaults...")
                resolve(null)
              }, 5000) // 5 second timeout for the query itself
            )
            
            dbPreferences = await Promise.race([dbPromise, timeoutPromise])
          } catch (queryError) {
            console.warn("📥 Database query failed, using defaults:", queryError)
            dbPreferences = null
          }

          if (dbPreferences) {
            console.log("📥 Loading preferences from database:", dbPreferences)
            set({
              preferredName: dbPreferences.preferred_name || "",
              occupation: dbPreferences.occupation || "",
              assistantTraits: dbPreferences.assistant_traits || DEFAULT_PREFERENCES.assistantTraits,
              customInstructions: dbPreferences.custom_instructions || "",
              uiFont: dbPreferences.ui_font || DEFAULT_PREFERENCES.uiFont,
              codeFont: dbPreferences.code_font || DEFAULT_PREFERENCES.codeFont,
              fontSize: (dbPreferences.font_size as "small" | "medium" | "large") || DEFAULT_PREFERENCES.fontSize,
              hasLoadedFromDB: true,
            })
          } else {
            console.log("📥 No preferences found in database or query timed out, using localStorage preferences")
            set({ hasLoadedFromDB: true })
            
            // Try to save current localStorage preferences to database (non-blocking)
            const state = get()
            setTimeout(async () => {
              try {
                await saveUserPreferences({
                  preferred_name: state.preferredName,
                  occupation: state.occupation,
                  assistant_traits: state.assistantTraits,
                  custom_instructions: state.customInstructions,
                  ui_font: state.uiFont,
                  code_font: state.codeFont,
                  font_size: state.fontSize,
                })
                console.log("📥 Saved localStorage preferences to database (background)")
              } catch (saveError) {
                console.log("📥 Could not save to database in background (table may not exist)")
              }
            }, 100) // Save in background after 100ms
          }
        } catch (error) {
          console.error("❌ Unexpected error in loadFromDatabase:", error)
          // Always mark as loaded so UI doesn't stay stuck
          set({ hasLoadedFromDB: true })
        } finally {
          clearTimeout(loadingTimeout)
          set({ isLoading: false })
          console.log("📥 UserPreferences loading completed and state cleared")
        }
      },

      reset: () => {
        set({
          ...DEFAULT_PREFERENCES,
          hasLoadedFromDB: true,
        })
        // Save the reset preferences to database
        debouncedSave(async () => {
          await saveUserPreferences({
            preferred_name: DEFAULT_PREFERENCES.preferredName,
            occupation: DEFAULT_PREFERENCES.occupation,
            assistant_traits: DEFAULT_PREFERENCES.assistantTraits,
            custom_instructions: DEFAULT_PREFERENCES.customInstructions,
            ui_font: DEFAULT_PREFERENCES.uiFont,
            code_font: DEFAULT_PREFERENCES.codeFont,
            font_size: DEFAULT_PREFERENCES.fontSize,
          })
        })
      },
    }),
    {
      name: "user-preferences",
      version: 2,
      // Only persist basic state, not loading states
      partialize: (state) => ({
        preferredName: state.preferredName,
        occupation: state.occupation,
        assistantTraits: state.assistantTraits,
        customInstructions: state.customInstructions,
        uiFont: state.uiFont,
        codeFont: state.codeFont,
        fontSize: state.fontSize,
      }),
    },
  ),
)
