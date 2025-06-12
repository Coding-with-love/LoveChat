"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { usePersonas } from "@/frontend/hooks/usePersonas"
import { toast } from "sonner"
import { Plus, Trash2, ArrowDown, Sparkles } from "lucide-react"

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPersonaId?: string
}

interface TemplateVariable {
  id: string
  name: string
  description: string
  defaultValue: string
  required: boolean
  inputType: "text" | "textarea"
}

const TEMPLATE_CATEGORIES = [
  "Writing",
  "Code Review",
  "Analysis",
  "Creative",
  "Education",
  "Business",
  "Research",
  "Other",
]

export function CreateTemplateDialog({ open, onOpenChange, selectedPersonaId }: CreateTemplateDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    template: "",
    category: "Other",
    tags: "",
    persona_id: selectedPersonaId || "none",
    is_public: false,
  })
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const { createTemplate, personas } = usePersonas()
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null)

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      id: Date.now().toString(),
      name: "",
      description: "",
      defaultValue: "",
      required: false,
      inputType: "text",
    }
    setVariables([...variables, newVariable])
  }

  const updateVariable = (id: string, field: keyof TemplateVariable, value: any) => {
    setVariables(variables.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id))
  }

  const insertVariable = (variableName: string) => {
    if (!templateTextareaRef.current || !variableName.trim()) return

    const textarea = templateTextareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = formData.template
    const variableText = `{{${variableName}}}`

    const newValue = currentValue.substring(0, start) + variableText + currentValue.substring(end)
    setFormData({ ...formData, template: newValue })

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variableText.length, start + variableText.length)
    }, 0)
  }

  const renderTemplateWithBadges = (text: string) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g)
    return parts.map((part, index) => {
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        const variableName = part.replace(/[{}]/g, "")
        const variable = variables.find((v) => v.name === variableName)
        return (
          <Badge key={index} variant="secondary" className="inline-flex items-center gap-1 mx-1">
            <Sparkles className="h-3 w-3" />
            {variableName}
          </Badge>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const generatePreview = () => {
    let preview = formData.template
    variables.forEach((variable) => {
      const placeholder = `{{${variable.name}}}`
      const value = variable.defaultValue || `[${variable.name}]`
      preview = preview.replace(new RegExp(placeholder, "g"), value)
    })
    return preview
  }

  const extractVariablesFromTemplate = () => {
    const variableMatches = formData.template.match(/\{\{([^}]+)\}\}/g) || []
    return variableMatches.map((match) => {
      const name = match.replace(/[{}]/g, "")
      const existingVar = variables.find((v) => v.name === name)
      return {
        name,
        description: existingVar?.description || "",
        default_value: existingVar?.defaultValue || "",
        required: existingVar?.required || false,
        input_type: existingVar?.inputType || "text",
      }
    })
  }

  const validateForm = () => {
    if (!formData.title.trim() || !formData.template.trim()) {
      toast.error("Title and template content are required")
      return false
    }

    // Check for duplicate variable names
    const variableNames = variables.map((v) => v.name.toLowerCase().trim()).filter(Boolean)
    const uniqueNames = new Set(variableNames)
    if (variableNames.length !== uniqueNames.size) {
      toast.error("Variable names must be unique")
      return false
    }

    // Check for variables with empty names
    const hasEmptyNames = variables.some((v) => !v.name.trim())
    if (hasEmptyNames) {
      toast.error("All variables must have names")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      const templateVariables = extractVariablesFromTemplate()

      const templateData = {
        ...formData,
        persona_id: formData.persona_id === "none" ? null : formData.persona_id,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        variables: templateVariables,
      }

      console.log("Submitting template data:", templateData)
      await createTemplate(templateData)
      toast.success("Template created successfully!")
      onOpenChange(false)

      // Reset form
      setFormData({
        title: "",
        description: "",
        template: "",
        category: "Other",
        tags: "",
        persona_id: selectedPersonaId || "none",
        is_public: false,
      })
      setVariables([])
      setShowPreview(false)
    } catch (error) {
      console.error("Template creation error:", error)
      toast.error("Failed to create template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a reusable prompt template with dynamic variables that you can quickly insert into conversations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Code Review Request"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of when to use this template"
            />
          </div>

          {/* Variables Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Template Variables</Label>
              <Button type="button" onClick={addVariable} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Variable
              </Button>
            </div>

            {variables.length > 0 && (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {variables.map((variable, index) => (
                  <div key={variable.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Variable {index + 1}</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => insertVariable(variable.name)}
                          size="sm"
                          variant="secondary"
                          disabled={!variable.name.trim()}
                          className="gap-1"
                        >
                          <ArrowDown className="h-3 w-3" />
                          Insert
                        </Button>
                        <Button
                          type="button"
                          onClick={() => removeVariable(variable.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Variable Name *</Label>
                        <Input
                          value={variable.name}
                          onChange={(e) => updateVariable(variable.id, "name", e.target.value)}
                          placeholder="e.g., topic, language, code"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Input Type</Label>
                        <Select
                          value={variable.inputType}
                          onValueChange={(value) => updateVariable(variable.id, "inputType", value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Single Line Text</SelectItem>
                            <SelectItem value="textarea">Multi-line Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Description</Label>
                      <Input
                        value={variable.description}
                        onChange={(e) => updateVariable(variable.id, "description", e.target.value)}
                        placeholder="What should the user enter here?"
                        className="text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Default Value</Label>
                        <Input
                          value={variable.defaultValue}
                          onChange={(e) => updateVariable(variable.id, "defaultValue", e.target.value)}
                          placeholder="Optional default value"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-5">
                        <Switch
                          checked={variable.required}
                          onCheckedChange={(checked) => updateVariable(variable.id, "required", checked)}
                        />
                        <Label className="text-sm">Required field</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="template">Template Content *</Label>
              {variables.length > 0 && (
                <Button type="button" onClick={() => setShowPreview(!showPreview)} size="sm" variant="outline">
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </Button>
              )}
            </div>

            {/* Visual Template Display */}
            {formData.template && (
              <div className="p-3 border rounded-lg bg-muted/20">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Template with Variables:</Label>
                <div className="text-sm leading-relaxed">{renderTemplateWithBadges(formData.template)}</div>
              </div>
            )}

            {showPreview && variables.length > 0 && (
              <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <Label className="text-xs font-medium text-green-700 dark:text-green-300 mb-2 block">
                  Preview with Default Values:
                </Label>
                <div className="text-sm whitespace-pre-wrap text-green-800 dark:text-green-200">
                  {generatePreview()}
                </div>
              </div>
            )}

            <Textarea
              ref={templateTextareaRef}
              id="template"
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              placeholder="Write your template content here. Add variables above and use the 'Insert' button to add them."
              className="min-h-[120px] font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Create variables above and click "Insert" to add them to your template. Variables will be shown as badges
              above.
            </p>
          </div>

          {/* Additional Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="persona">Associated Persona</Label>
              <Select
                value={formData.persona_id}
                onValueChange={(value) => setFormData({ ...formData, persona_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select persona (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific persona</SelectItem>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.avatar_emoji} {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="code, review, javascript"
              />
              <p className="text-xs text-muted-foreground">Comma-separated tags</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
            />
            <Label htmlFor="is_public">Make this template public</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
