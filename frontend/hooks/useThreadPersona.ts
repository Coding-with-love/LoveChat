"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  setThreadPersona as setThreadPersonaQuery,
  getThreadPersona,
  removeThreadPersona,
} from "@/lib/supabase/queries"
import { usePersonaStore } from "@/frontend/stores/PersonaStore"

export function useThreadPersona(threadId: string | null) {
  const [currentPersona, setCurrentPersona] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { 
    getThreadPersona: getThreadPersonaFromStore, 
    threadPersonas,
    setThreadPersona: setThreadPersonaInStore,
    removeThreadPersona: removeThreadPersonaFromStore
  } = usePersonaStore()

  // Load the current persona for this thread
  useEffect(() => {
    if (!threadId) return

    // First check the store for immediate state
    const storePersona = getThreadPersonaFromStore(threadId)
    if (storePersona) {
      setCurrentPersona(storePersona)
      return
    }

    // Fallback to database query if not in store
    const loadPersona = async () => {
      try {
        setIsLoading(true)
        const persona = await getThreadPersona(threadId)
        setCurrentPersona(persona)
      } catch (error) {
        console.error("Failed to load thread persona:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPersona()
  }, [threadId, threadPersonas, getThreadPersonaFromStore])

  const setThreadPersona = async (personaId: string) => {
    if (!threadId) {
      toast.error("No thread selected")
      return
    }

    try {
      setIsLoading(true)
      
      // Update store immediately for UI responsiveness
      setThreadPersonaInStore(threadId, personaId)
      
      // Also update local state immediately
      const storePersona = getThreadPersonaFromStore(threadId)
      if (storePersona) {
        setCurrentPersona(storePersona)
      }

      // Database update happens asynchronously in the store
      toast.success("Persona activated for this conversation")
    } catch (error) {
      console.error("Failed to set thread persona:", error)
      toast.error("Failed to activate persona")
    } finally {
      setIsLoading(false)
    }
  }

  const clearThreadPersona = async () => {
    if (!threadId) {
      toast.error("No thread selected")
      return
    }

    try {
      setIsLoading(true)
      
      // Update store immediately
      removeThreadPersonaFromStore(threadId)
      setCurrentPersona(null)
      
      // Database update happens asynchronously in the store
      toast.success("Persona cleared from conversation")
    } catch (error) {
      console.error("Failed to clear thread persona:", error)
      toast.error("Failed to clear persona")
    } finally {
      setIsLoading(false)
    }
  }

  return {
    currentPersona,
    setThreadPersona,
    clearThreadPersona,
    isLoading,
  }
}
