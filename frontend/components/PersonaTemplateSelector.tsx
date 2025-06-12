"use client"

import type React from "react"
import { useState } from "react"
import type { Persona } from "@/lib/supabase/types"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { usePersonas } from "@/frontend/hooks/usePersonas"
import { usePersonaStore } from "@/frontend/stores/PersonaStore"
import type { PromptTemplate } from "@/frontend/stores/PersonaStore"
import { User, FileText, Plus, Bot, Pencil } from "lucide-react"

interface PersonaTemplateSelectorProps {
  threadId: string
  onPersonaSelect?: (persona: Persona | null) => void
  onTemplateSelect?: (template: PromptTemplate) => void
  onCreatePersona?: () => void
  onCreateTemplate?: () => void
  onEditPersona?: (persona: Persona) => void
  onEditTemplate?: (template: PromptTemplate) => void
}

const PersonaTemplateSelector: React.FC<PersonaTemplateSelectorProps> = ({
  threadId,
  onPersonaSelect,
  onTemplateSelect,
  onCreatePersona,
  onCreateTemplate,
  onEditPersona,
  onEditTemplate,
}) => {
  const [activeTab, setActiveTab] = useState("personas")
  const { personas, loading: personasLoading, promptTemplates, templatesLoading } = usePersonas()
  const { getThreadPersona, setThreadPersona, removeThreadPersona, getDefaultPersona } = usePersonaStore()

  const currentPersona = getThreadPersona(threadId)
  const defaultPersona = getDefaultPersona()

  const handlePersonaSelect = (persona: Persona | null) => {
    try {
      if (persona) {
        setThreadPersona(threadId, persona.id)
        toast.success(`${persona.name} is now active`)
      } else {
        if (defaultPersona) {
          setThreadPersona(threadId, defaultPersona.id)
        } else {
          removeThreadPersona(threadId)
        }
        toast.success("Switched to default")
      }
      onPersonaSelect?.(persona)
    } catch (error) {
      toast.error("Failed to activate persona")
    }
  }

  const handleTemplateSelect = (template: PromptTemplate) => {
    try {
      onTemplateSelect?.(template)
      toast.success(`Template "${template.title}" selected`)
    } catch (error) {
      toast.error("Failed to select template")
    }
  }

  // Handle edit button click without propagating to the parent button
  const handleEditClick = (e: React.MouseEvent, item: Persona | PromptTemplate, isPersona: boolean) => {
    e.stopPropagation()
    if (isPersona && onEditPersona) {
      onEditPersona(item as Persona)
    } else if (!isPersona && onEditTemplate) {
      onEditTemplate(item as PromptTemplate)
    }
  }

  if (personasLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-4 flex justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="font-medium text-sm text-foreground mb-1">AI Persona & Templates</h3>
          <p className="text-xs text-muted-foreground">Choose a persona or template to get started</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 bg-muted/30">
            <TabsTrigger value="personas" className="text-xs data-[state=active]:bg-background">
              <Bot className="h-3 w-3 mr-1" />
              Personas ({personas.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs data-[state=active]:bg-background">
              <FileText className="h-3 w-3 mr-1" />
              Templates ({promptTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personas" className="mt-3">
            <ScrollArea className="h-48 w-full">
              <div className="space-y-2 pr-3">
                {/* Default option */}
                <div
                  className={`
                    relative group cursor-pointer rounded-md p-2 transition-colors
                    ${
                      !currentPersona || currentPersona.is_default
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }
                  `}
                  onClick={() => handlePersonaSelect(null)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="p-1 rounded bg-muted">
                      <User className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium flex items-center gap-1">
                        Default Assistant
                        {(!currentPersona || currentPersona.is_default) && (
                          <Badge variant="default" className="text-[10px] px-1 py-0">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">Standard AI assistant</div>
                    </div>
                  </div>
                </div>

                {/* Personas */}
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    className={`
                      relative group cursor-pointer rounded-md p-2 transition-colors
                      ${
                        currentPersona?.id === persona.id
                          ? "bg-secondary text-secondary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      }
                    `}
                    onClick={() => handlePersonaSelect(persona)}
                  >
                    <div className="flex items-center gap-2 w-full pr-8">
                      <div className="text-sm">{persona.avatar_emoji || "🤖"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium flex items-center gap-1">
                          {persona.name}
                          {currentPersona?.id === persona.id && (
                            <Badge variant="default" className="text-[10px] px-1 py-0">
                              Active
                            </Badge>
                          )}
                          {persona.is_public && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Public
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{persona.description}</div>
                      </div>
                    </div>
                    {onEditPersona && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background rounded-sm flex items-center justify-center"
                        onClick={(e) => handleEditClick(e, persona, true)}
                        aria-label={`Edit ${persona.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Create button */}
                {onCreatePersona && (
                  <div
                    className="cursor-pointer rounded-md p-2 border border-dashed border-muted-foreground/30 hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={onCreatePersona}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="p-1 rounded bg-muted">
                        <Plus className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-muted-foreground">Create New Persona</div>
                        <div className="text-[10px] text-muted-foreground">Add custom AI personality</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="templates" className="mt-3">
            <ScrollArea className="h-48 w-full">
              <div className="space-y-2 pr-3">
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                      Loading templates...
                    </div>
                  </div>
                ) : promptTemplates.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-xs text-muted-foreground mb-2">No templates yet</div>
                    {onCreateTemplate && (
                      <Button size="sm" onClick={onCreateTemplate} className="text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Create Template
                      </Button>
                    )}
                  </div>
                ) : (
                  promptTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="relative group cursor-pointer rounded-md p-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-center gap-2 w-full pr-8">
                        <div className="p-1 rounded bg-muted">
                          <FileText className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium flex items-center gap-1">
                            {template.title}
                            {template.category && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {template.category}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{template.description}</div>
                        </div>
                      </div>
                      {onEditTemplate && (
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background rounded-sm flex items-center justify-center"
                          onClick={(e) => handleEditClick(e, template, false)}
                          aria-label={`Edit ${template.title}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}

                {/* Create template button */}
                {onCreateTemplate && promptTemplates.length > 0 && (
                  <div
                    className="cursor-pointer rounded-md p-2 border border-dashed border-muted-foreground/30 hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={onCreateTemplate}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="p-1 rounded bg-muted">
                        <Plus className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-muted-foreground">Create New Template</div>
                        <div className="text-[10px] text-muted-foreground">Add custom prompt template</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default PersonaTemplateSelector
