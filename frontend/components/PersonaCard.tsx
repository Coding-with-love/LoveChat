"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Persona } from "@/frontend/stores/PersonaStore"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { usePersonas } from "@/frontend/hooks/usePersonas"
import { usePersonaStore } from "@/frontend/stores/PersonaStore"

interface PersonaCardProps {
  threadId: string
}

export const PersonaCard: React.FC<PersonaCardProps> = ({ threadId }) => {
  const { personas, loading } = usePersonas()
  const { getThreadPersona, setThreadPersona, removeThreadPersona } = usePersonaStore()
  
  const currentPersona = getThreadPersona(threadId)

  const handlePersonaSelect = (persona: Persona) => {
    try {
      setThreadPersona(threadId, persona.id)
      toast.success(`${persona.name} is now active for this conversation`)
    } catch (error) {
      toast.error("Failed to activate persona")
    }
  }

  const handleClearPersona = () => {
    try {
      removeThreadPersona(threadId)
      toast.success("Persona cleared")
    } catch (error) {
      toast.error("Failed to clear persona")
    }
  }

  if (loading) {
    return (
      <div className="w-full">
        <Card>
          <CardContent className="p-8 flex justify-center">
            <div className="text-sm text-muted-foreground">Loading personas...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Choose a Persona</CardTitle>
          <CardDescription>Select a persona to guide the conversation.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[300px] w-full pr-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {personas.map((persona) => (
                <Button
                  key={persona.id}
                  variant="outline"
                  className={`w-full text-sm ${currentPersona?.id === persona.id ? "bg-secondary hover:bg-secondary/80" : ""}`}
                  onClick={() => handlePersonaSelect(persona)}
                >
                  <span className="mr-2">{persona.avatar_emoji}</span>
                  {persona.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={handleClearPersona}>
            Clear Persona
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
