"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { usePersonas } from "@/frontend/hooks/usePersonas"
import { toast } from "sonner"
import type { PromptTemplate } from "@/frontend/stores/PersonaStore"

interface EditTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: PromptTemplate | null
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

export function EditTemplateDialog({ open, onOpenChange, template }: EditTemplateDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    template: "",
    category: "Other",
    tags: "",
    persona_id: "none",
    is_public: false,
  })
  const [loading, setLoading] = useState(false)
  const { personas, updateTemplate } = usePersonas()

  // Update form data when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title || "",
        description: template.description || "",
        template: template.template || "",
        category: template.category || "Other",
        tags: Array.isArray(template.tags) ? template.tags.join(", ") : "",
        persona_id: template.persona_id || "none",
        is_public: template.is_public || false,
      })
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!template) return
    
    if (!formData.title.trim() || !formData.template.trim()) {
      toast.error("Title and template content are required")
      return
    }

    setLoading(true)
    try {
      const templateData = {
        ...formData,
        persona_id: formData.persona_id === "none" ? "" : formData.persona_id,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        variables: [], // TODO: Extract variables from template
      }
      await updateTemplate(template.id, templateData)
      toast.success("Template updated successfully!")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to update template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Modify this prompt template for your conversations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="template">Template Content *</Label>
            <Textarea
              id="template"
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              placeholder="Please review this code for {{language}}:

{{code}}

Focus on:
- Performance
- Security
- Best practices"
              className="min-h-[120px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use {`{{variable}}`} syntax for dynamic content (e.g., {`{{topic}}`}, {`{{code}}`})
            </p>
          </div>

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
              {loading ? "Updating..." : "Update Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
