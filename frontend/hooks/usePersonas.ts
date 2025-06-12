"use client"

import { useEffect, useCallback } from "react"
import { usePersonaStore, type Persona, type PromptTemplate } from "@/frontend/stores/PersonaStore"
import { toast } from "sonner"
import { getAuthHeaders } from "@/lib/auth-headers"

export function usePersonas() {
  const {
    personas,
    promptTemplates,
    selectedPersona,
    loading,
    templatesLoading,
    setPersonas,
    setPromptTemplates,
    setSelectedPersona,
    setLoading,
    setTemplatesLoading,
    addPersona,
    updatePersona: updatePersonaInStore,
    removePersona,
    addTemplate,
    updateTemplate: updateTemplateInStore,
    removeTemplate,
    incrementTemplateUsage,
    getDefaultPersona,
    getPersonaById,
    getTemplateById,
  } = usePersonaStore()

  // Fetch personas
  const fetchPersonas = useCallback(
    async (includePublic = true) => {
      try {
        setLoading(true)
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/personas?includePublic=${includePublic}`, {
          headers,
        })

        if (!response.ok) {
          // Don't show error for 500 if it's likely due to missing tables
          if (response.status === 500) {
            console.warn("Personas table may not exist yet")
            setPersonas([])
            return
          }
          throw new Error("Failed to fetch personas")
        }

        const { personas: fetchedPersonas } = await response.json()
        setPersonas(fetchedPersonas || [])

        // Set default persona if none selected
        if (!selectedPersona && fetchedPersonas && fetchedPersonas.length > 0) {
          const defaultPersona = fetchedPersonas.find((p: Persona) => p.is_default) || fetchedPersonas[0]
          setSelectedPersona(defaultPersona)
        }
      } catch (error) {
        console.error("Error fetching personas:", error)
        setPersonas([])
        // Only show toast for non-500 errors
        if (error instanceof Error && !error.message.includes("500")) {
          toast.error("Failed to load personas")
        }
      } finally {
        setLoading(false)
      }
    },
    [setLoading, setPersonas, selectedPersona, setSelectedPersona],
  )

  // Fetch prompt templates
  const fetchPromptTemplates = useCallback(
    async (
      includePublic = true,
      filters?: {
        category?: string
        personaId?: string
      },
    ) => {
      try {
        setTemplatesLoading(true)
        const headers = await getAuthHeaders()
        const params = new URLSearchParams({
          includePublic: includePublic.toString(),
          ...(filters?.category && { category: filters.category }),
          ...(filters?.personaId && { personaId: filters.personaId }),
        })

        const response = await fetch(`/api/prompt-templates?${params}`, {
          headers,
        })

        if (!response.ok) {
          // Don't show error for 500 if it's likely due to missing tables
          if (response.status === 500) {
            console.warn("Prompt templates table may not exist yet")
            setPromptTemplates([])
            return
          }
          throw new Error("Failed to fetch prompt templates")
        }

        const { templates } = await response.json()
        setPromptTemplates(templates || [])
      } catch (error) {
        console.error("Error fetching prompt templates:", error)
        setPromptTemplates([])
        // Only show toast for non-500 errors
        if (error instanceof Error && !error.message.includes("500")) {
          toast.error("Failed to load prompt templates")
        }
      } finally {
        setTemplatesLoading(false)
      }
    },
    [setTemplatesLoading, setPromptTemplates],
  )

  // Create persona
  const createPersona = useCallback(
    async (personaData: Omit<Persona, "id" | "user_id" | "created_at" | "updated_at">) => {
      try {
        const headers = await getAuthHeaders()
        const response = await fetch("/api/personas", {
          method: "POST",
          headers,
          body: JSON.stringify(personaData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to create persona")
        }

        const { persona } = await response.json()
        addPersona(persona)
        toast.success("Persona created successfully")
        return persona
      } catch (error) {
        console.error("Error creating persona:", error)
        toast.error(error instanceof Error ? error.message : "Failed to create persona")
        throw error
      }
    },
    [addPersona],
  )

  // Update persona
  const updatePersona = useCallback(
    async (personaId: string, updates: Partial<Persona>) => {
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/personas/${personaId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to update persona")
        }

        const { persona } = await response.json()
        updatePersonaInStore(persona)
        toast.success("Persona updated successfully")
        return persona
      } catch (error) {
        console.error("Error updating persona:", error)
        toast.error(error instanceof Error ? error.message : "Failed to update persona")
        throw error
      }
    },
    [updatePersonaInStore],
  )

  // Delete persona
  const deletePersona = useCallback(
    async (personaId: string) => {
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/personas/${personaId}`, {
          method: "DELETE",
          headers,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to delete persona")
        }

        removePersona(personaId)
        toast.success("Persona deleted successfully")
      } catch (error) {
        console.error("Error deleting persona:", error)
        toast.error(error instanceof Error ? error.message : "Failed to delete persona")
        throw error
      }
    },
    [removePersona],
  )

  // Create prompt template
  const createTemplate = useCallback(
    async (templateData: Omit<PromptTemplate, "id" | "user_id" | "created_at" | "updated_at" | "usage_count">) => {
      try {
        const headers = await getAuthHeaders()
        const response = await fetch("/api/prompt-templates", {
          method: "POST",
          headers,
          body: JSON.stringify(templateData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to create template")
        }

        const { template } = await response.json()
        addTemplate(template)
        toast.success("Template created successfully")
        return template
      } catch (error) {
        console.error("Error creating template:", error)
        toast.error(error instanceof Error ? error.message : "Failed to create template")
        throw error
      }
    },
    [addTemplate],
  )

  // Update template
  const updateTemplate = useCallback(
    async (templateId: string, updates: Partial<PromptTemplate>) => {
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/prompt-templates/${templateId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to update template")
        }

        const { template } = await response.json()
        updateTemplateInStore(template)
        toast.success("Template updated successfully")
        return template
      } catch (error) {
        console.error("Error updating template:", error)
        toast.error(error instanceof Error ? error.message : "Failed to update template")
        throw error
      }
    },
    [updateTemplateInStore],
  )

  // Delete template
  const deleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/prompt-templates/${templateId}`, {
          method: "DELETE",
          headers,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to delete template")
        }

        removeTemplate(templateId)
        toast.success("Template deleted successfully")
      } catch (error) {
        console.error("Error deleting template:", error)
        toast.error(error instanceof Error ? error.message : "Failed to delete template")
        throw error
      }
    },
    [removeTemplate],
  )

  // Apply template (process variables and return final prompt)
  const applyTemplate = useCallback(
    (template: PromptTemplate, variables: Record<string, string>) => {
      let processedTemplate = template.template

      // Replace variables in template
      template.variables.forEach((variable) => {
        const value = variables[variable.name] || ""
        const placeholder = `{{${variable.name}}}`
        processedTemplate = processedTemplate.replace(new RegExp(placeholder, "g"), value)
      })

      // Increment usage count
      incrementTemplateUsage(template.id)

      return processedTemplate
    },
    [incrementTemplateUsage],
  )

  // Load data on mount
  useEffect(() => {
    fetchPersonas()
    fetchPromptTemplates()
  }, [fetchPersonas, fetchPromptTemplates])

  return {
    // State
    personas,
    promptTemplates,
    selectedPersona,
    loading,
    templatesLoading,

    // Actions
    fetchPersonas,
    fetchPromptTemplates,
    createPersona,
    updatePersona,
    deletePersona,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    setSelectedPersona,

    // Utilities
    getDefaultPersona,
    getPersonaById,
    getTemplateById,
  }
}
