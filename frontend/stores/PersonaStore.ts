import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Persona {
  id: string
  user_id: string
  name: string
  description?: string
  system_prompt: string
  avatar_emoji: string
  color: string
  is_default: boolean
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  name: string
  description?: string
  default_value?: string
  required: boolean
}

export interface PromptTemplate {
  id: string
  user_id: string
  title: string
  description?: string
  template: string
  variables: TemplateVariable[]
  category?: string
  tags: string[]
  persona_id?: string
  personas?: {
    id: string
    name: string
    avatar_emoji: string
    color: string
  }
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

interface PersonaStore {
  personas: Persona[]
  promptTemplates: PromptTemplate[]
  selectedPersona: Persona | null
  threadPersonas: Record<string, string> // threadId -> personaId mapping
  loading: boolean
  templatesLoading: boolean

  // Actions
  setPersonas: (personas: Persona[]) => void
  setPromptTemplates: (templates: PromptTemplate[]) => void
  setSelectedPersona: (persona: Persona | null) => void
  setThreadPersona: (threadId: string, personaId: string) => void
  removeThreadPersona: (threadId: string) => void
  getThreadPersona: (threadId: string) => Persona | null
  setLoading: (loading: boolean) => void
  setTemplatesLoading: (loading: boolean) => void
  addPersona: (persona: Persona) => void
  updatePersona: (persona: Persona) => void
  removePersona: (personaId: string) => void
  addTemplate: (template: PromptTemplate) => void
  updateTemplate: (template: PromptTemplate) => void
  removeTemplate: (templateId: string) => void
  incrementTemplateUsage: (templateId: string) => void

  // Utilities
  getDefaultPersona: () => Persona | null
  getPersonaById: (id: string) => Persona | null
  getTemplateById: (id: string) => PromptTemplate | null
}

export const usePersonaStore = create<PersonaStore>()(
  persist(
    (set, get) => ({
      personas: [],
      promptTemplates: [],
      selectedPersona: null,
      threadPersonas: {},
      loading: false,
      templatesLoading: false,

      setPersonas: (personas) => set({ personas }),
      setPromptTemplates: (promptTemplates) => set({ promptTemplates }),
      setSelectedPersona: (selectedPersona) => set({ selectedPersona }),

      setThreadPersona: (threadId, personaId) =>
        set((state) => {
          // Update local state immediately for UI responsiveness
          const newThreadPersonas = {
            ...state.threadPersonas,
            [threadId]: personaId,
          }
          
          // Async update to database (don't await to avoid blocking UI)
          import("@/lib/supabase/queries").then(({ setThreadPersona }) => {
            setThreadPersona(threadId, personaId).catch((error) => {
              console.error("Failed to save thread persona:", error)
              // Revert local state on database error
              set((currentState) => {
                const { [threadId]: removed, ...rest } = currentState.threadPersonas
                return { threadPersonas: rest }
              })
            })
          })
          
          return { threadPersonas: newThreadPersonas }
        }),

      removeThreadPersona: (threadId) =>
        set((state) => {
          const { [threadId]: removed, ...rest } = state.threadPersonas
          
          // Async update to database (don't await to avoid blocking UI)
          import("@/lib/supabase/queries").then(({ removeThreadPersona }) => {
            removeThreadPersona(threadId).catch((error) => {
              console.error("Failed to remove thread persona:", error)
              // Revert local state on database error
              set((currentState) => ({
                threadPersonas: { ...currentState.threadPersonas, [threadId]: removed }
              }))
            })
          })
          
          return { threadPersonas: rest }
        }),

      getThreadPersona: (threadId) => {
        const { threadPersonas, personas } = get()
        const personaId = threadPersonas[threadId]
        return personaId ? personas.find((p) => p.id === personaId) || null : null
      },

      setLoading: (loading) => set({ loading }),
      setTemplatesLoading: (templatesLoading) => set({ templatesLoading }),

      addPersona: (persona) =>
        set((state) => ({
          personas: [persona, ...state.personas],
        })),

      updatePersona: (updatedPersona) =>
        set((state) => ({
          personas: state.personas.map((persona) => (persona.id === updatedPersona.id ? updatedPersona : persona)),
          selectedPersona: state.selectedPersona?.id === updatedPersona.id ? updatedPersona : state.selectedPersona,
        })),

      removePersona: (personaId) =>
        set((state) => ({
          personas: state.personas.filter((persona) => persona.id !== personaId),
          selectedPersona: state.selectedPersona?.id === personaId ? null : state.selectedPersona,
          threadPersonas: Object.fromEntries(
            Object.entries(state.threadPersonas).filter(([_, id]) => id !== personaId),
          ),
        })),

      addTemplate: (template) =>
        set((state) => ({
          promptTemplates: [template, ...state.promptTemplates],
        })),

      updateTemplate: (updatedTemplate) =>
        set((state) => ({
          promptTemplates: state.promptTemplates.map((template) =>
            template.id === updatedTemplate.id ? updatedTemplate : template,
          ),
        })),

      removeTemplate: (templateId) =>
        set((state) => ({
          promptTemplates: state.promptTemplates.filter((template) => template.id !== templateId),
        })),

      incrementTemplateUsage: (templateId) =>
        set((state) => ({
          promptTemplates: state.promptTemplates.map((template) =>
            template.id === templateId ? { ...template, usage_count: template.usage_count + 1 } : template,
          ),
        })),

      getDefaultPersona: () => {
        const { personas } = get()
        return personas.find((persona) => persona.is_default) || null
      },

      getPersonaById: (id) => {
        const { personas } = get()
        return personas.find((persona) => persona.id === id) || null
      },

      getTemplateById: (id) => {
        const { promptTemplates } = get()
        return promptTemplates.find((template) => template.id === id) || null
      },
    }),
    {
      name: "persona-store",
      partialize: (state) => ({
        selectedPersona: state.selectedPersona,
        threadPersonas: state.threadPersonas,
      }),
    },
  ),
)
