import React from "react"

import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Persona, PromptTemplate as Template } from "@/frontend/stores/PersonaStore"

interface PersonaTemplateSelectorProps {
  personas?: Persona[]
  templates?: Template[]
  threadId?: string
  selectedPersonaId?: string
  selectedTemplateId?: string
  onPersonaSelect?: (persona: Persona) => void
  onTemplateSelect?: (template: Template) => void
  onCreatePersona?: () => void
  onCreateTemplate?: () => void
}

const PersonaTemplateSelector: React.FC<PersonaTemplateSelectorProps> = ({ 
  personas = [], // Add default empty array
  templates = [], // Add default empty array
  threadId,
  onCreatePersona,
  onCreateTemplate,
  selectedPersonaId,
  selectedTemplateId,
  onPersonaSelect,
  onTemplateSelect
}) => {
  const handlePersonaSelect = (persona: Persona) => {
    if (!onPersonaSelect) {
      toast.error("onPersonaSelect is not defined")
      return
    }
    onPersonaSelect(persona)
  }

  const handleTemplateSelect = (template: Template) => {
    if (!onTemplateSelect) {
      toast.error("onTemplateSelect is not defined")
      return
    }
    onTemplateSelect(template)
  }

  if (!personas || personas.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        <p>No personas available</p>
        {onCreatePersona && (
          <Button variant="outline" onClick={onCreatePersona} className="mt-2">
            Create Your First Persona
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Choose a Persona</CardTitle>
          <CardDescription>
            Select a persona to guide the conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="flex flex-col space-y-2 p-2">
              {personas?.map((persona) => (
                <Button
                  key={persona.id}
                  variant={selectedPersonaId === persona.id ? "default" : "outline"}
                  className="justify-start text-left h-auto p-3"
                  onClick={() => handlePersonaSelect(persona)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{persona.avatar_emoji || "🤖"}</span>
                    <div>
                      <div className="font-medium">{persona.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {persona.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
              {onCreatePersona && (
                <Button variant="ghost" onClick={onCreatePersona}>
                  + Create New Persona
                </Button>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Choose a Template</CardTitle>
          <CardDescription>
            Select a template to start the conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="flex flex-col space-y-2 p-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplateId === template.id ? "default" : "outline"}
                  className="justify-start text-left h-auto p-3"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <div>
                      <div className="font-medium">{template.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
              {onCreateTemplate && (
                <Button variant="ghost" onClick={onCreateTemplate}>
                  + Create New Template
                </Button>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default PersonaTemplateSelector
