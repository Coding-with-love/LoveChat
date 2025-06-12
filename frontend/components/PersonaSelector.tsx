"use client"

import { useState, useMemo } from "react"
import { User, Plus, Check, Crown, Settings } from 'lucide-react'
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Badge } from "./ui/badge"
import { usePersonas } from "@/frontend/hooks/usePersonas"
import { usePersonaStore } from "@/frontend/stores/PersonaStore"
import { cn } from "@/lib/utils"

interface PersonaSelectorProps {
  threadId: string
  size?: "sm" | "default" | "lg"
  showLabel?: boolean
  className?: string
  embedded?: boolean
  onPersonaChange?: () => void
}

export function PersonaSelector({
  threadId,
  size = "default",
  showLabel = true,
  className,
  embedded = false,
  onPersonaChange,
}: PersonaSelectorProps) {
  const { personas, loading: personasLoading } = usePersonas()
  const { getThreadPersona, setThreadPersona, removeThreadPersona, getDefaultPersona } = usePersonaStore()
  const [open, setOpen] = useState(false)

  const currentPersona = getThreadPersona(threadId)
  const defaultPersona = getDefaultPersona()

  // Sort personas: current first, then alphabetically
  const sortedPersonas = useMemo(() => {
    return [...personas].sort((a, b) => {
      if (a.id === currentPersona?.id) return -1
      if (b.id === currentPersona?.id) return 1
      return a.name.localeCompare(b.name)
    })
  }, [personas, currentPersona?.id])

  const handlePersonaSelect = (personaId: string | null) => {
    if (personaId) {
      setThreadPersona(threadId, personaId)
    } else {
      // When selecting "No Persona (Default)", set the default persona if one exists
      // Otherwise, remove the thread persona entirely
      if (defaultPersona) {
        setThreadPersona(threadId, defaultPersona.id)
      } else {
        removeThreadPersona(threadId)
      }
    }
    if (!embedded) {
      setOpen(false)
    }
    onPersonaChange?.()
  }

  if (personasLoading) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        <User className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    )
  }

  if (embedded) {
    return (
      <div className="space-y-2">
        {/* None option */}
        <Button
          variant={(!currentPersona || currentPersona.is_default) ? "default" : "outline"}
          size="sm"
          onClick={() => handlePersonaSelect(null)}
          className="w-full justify-start"
        >
          <User className="h-4 w-4 mr-2" />
          No Persona (Default)
          {(!currentPersona || currentPersona.is_default) && <Check className="h-4 w-4 ml-auto" />}
        </Button>

        {/* Personas */}
        {sortedPersonas.map((persona) => (
          <Button
            key={persona.id}
            variant={currentPersona?.id === persona.id ? "default" : "outline"}
            size="sm"
            onClick={() => handlePersonaSelect(persona.id)}
            className="w-full justify-start"
          >
            <span className="mr-2">{persona.avatar_emoji}</span>
            <span className="flex-1 text-left">{persona.name}</span>
            <div className="flex items-center gap-1 ml-2">
              {persona.is_public && <Crown className="h-3 w-3 text-yellow-500" />}
              {currentPersona?.id === persona.id && <Check className="h-4 w-4" />}
            </div>
          </Button>
        ))}
      </div>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("flex items-center gap-2", className)}
        >
          {currentPersona && !currentPersona.is_default ? (
            <>
              <span>{currentPersona.avatar_emoji}</span>
              {showLabel && <span>{currentPersona.name}</span>}
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        <DropdownMenuLabel>Select AI Persona</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* None option */}
        <DropdownMenuItem onClick={() => handlePersonaSelect(null)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>No Persona (Default)</span>
            </div>
            {(!currentPersona || currentPersona.is_default) && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Personas */}
        {sortedPersonas.map((persona) => (
          <DropdownMenuItem
            key={persona.id}
            onClick={() => handlePersonaSelect(persona.id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span>{persona.avatar_emoji}</span>
              <div className="flex flex-col">
                <span className="font-medium">{persona.name}</span>
                {persona.description && (
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {persona.description}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {persona.is_public && <Crown className="h-3 w-3 text-yellow-500" />}
              {currentPersona?.id === persona.id && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="h-4 w-4 mr-2" />
          Create New Persona
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
