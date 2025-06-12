"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import type { PromptTemplate } from "@/frontend/stores/PersonaStore"

interface TemplateVariableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: PromptTemplate | null
  onInsert: (processedTemplate: string) => void
}

export function TemplateVariableDialog({ open, onOpenChange, template, onInsert }: TemplateVariableDialogProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when template changes or dialog opens
  useEffect(() => {
    if (template && open) {
      const initialValues: Record<string, string> = {}
      template.variables?.forEach((variable) => {
        initialValues[variable.name] = variable.default_value || ""
      })
      setVariableValues(initialValues)
      setErrors({})
    }
  }, [template, open])

  const handleVariableChange = (variableName: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [variableName]: value,
    }))

    // Clear error when user starts typing
    if (errors[variableName]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[variableName]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    template?.variables?.forEach((variable) => {
      if (variable.required && !variableValues[variable.name]?.trim()) {
        newErrors[variable.name] = `${variable.name} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const processTemplate = (templateText: string, values: Record<string, string>) => {
    let processed = templateText

    // Replace variables in the format {{variableName}} or {variableName}
    Object.entries(values).forEach(([name, value]) => {
      const patterns = [new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g"), new RegExp(`\\{\\s*${name}\\s*\\}`, "g")]

      patterns.forEach((pattern) => {
        processed = processed.replace(pattern, value)
      })
    })

    return processed
  }

  const handleInsert = () => {
    if (!template) return

    if (!validateForm()) return

    const processedTemplate = processTemplate(template.template, variableValues)
    onInsert(processedTemplate)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!template) return null

  const hasVariables = template.variables && template.variables.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>📝</span>
            Insert Template: {template.title}
          </DialogTitle>
          <DialogDescription>{template.description || "Fill in the template variables below"}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4 pb-4">
          <div className="space-y-6 pb-4">
            {/* Template Preview */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Template Preview</Label>
              <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.template.substring(0, 200)}
                  {template.template.length > 200 && "..."}
                </p>
              </div>
            </div>

            {/* Template Variables */}
            {hasVariables ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Template Variables</Label>
                  <Badge variant="secondary" className="text-xs">
                    {template.variables.length} variable{template.variables.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <Separator />

                <div className="grid gap-4">
                  {template.variables.map((variable, index) => (
                    <div key={variable.name} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`var-${variable.name}`} className="text-sm font-medium">
                          {variable.name}
                          {variable.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {variable.description && (
                          <span className="text-xs text-muted-foreground">- {variable.description}</span>
                        )}
                      </div>

                      {/* Determine input type based on variable name or description */}
                      {variable.name.toLowerCase().includes("description") ||
                      variable.name.toLowerCase().includes("content") ||
                      variable.name.toLowerCase().includes("text") ||
                      (variable.description && variable.description.length > 50) ? (
                        <Textarea
                          id={`var-${variable.name}`}
                          placeholder={variable.default_value || `Enter ${variable.name}...`}
                          value={variableValues[variable.name] || ""}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          className={errors[variable.name] ? "border-destructive" : ""}
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={`var-${variable.name}`}
                          placeholder={variable.default_value || `Enter ${variable.name}...`}
                          value={variableValues[variable.name] || ""}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          className={errors[variable.name] ? "border-destructive" : ""}
                        />
                      )}

                      {errors[variable.name] && <p className="text-sm text-destructive">{errors[variable.name]}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  This template has no variables. It will be inserted as-is.
                </p>
              </div>
            )}

            {/* Live Preview */}
            {hasVariables && Object.keys(variableValues).some((key) => variableValues[key]) && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Live Preview</Label>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm whitespace-pre-wrap">{processTemplate(template.template, variableValues)}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleInsert} className="gap-2">
            <span>📝</span>
            Insert Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
