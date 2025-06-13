"use client"

import { useState } from "react"
import { useArtifactStore, type CreateArtifactData } from "@/frontend/stores/ArtifactStore"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { Textarea } from "@/frontend/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select"
import { Badge } from "@/frontend/components/ui/badge"
import { X } from 'lucide-react'
import { toast } from "sonner"

interface CreateArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadId?: string
  initialData?: Partial<CreateArtifactData>
}

const CONTENT_TYPES = [
  { value: "text", label: "Text" },
  { value: "code", label: "Code" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
]

const COMMON_TAGS = [
  "code", "script", "function", "component", "utility", "example", 
  "tutorial", "documentation", "snippet", "template", "config"
]

export function CreateArtifactDialog({ 
  open, 
  onOpenChange, 
  threadId,
  initialData 
}: CreateArtifactDialogProps) {
  const { createArtifact, isLoading } = useArtifactStore()
  
  const [formData, setFormData] = useState<CreateArtifactData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    content: initialData?.content || "",
    content_type: initialData?.content_type || "text",
    language: initialData?.language || "",
    file_extension: initialData?.file_extension || "",
    tags: initialData?.tags || [],
    metadata: initialData?.metadata || {},
    thread_id: threadId,
    message_id: initialData?.message_id
  })

  const [newTag, setNewTag] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required")
      return
    }

    try {
      const artifact = await createArtifact(formData)
      if (artifact) {
        toast.success("Artifact created successfully!")
        onOpenChange(false)
        // Reset form
        setFormData({
          title: "",
          description: "",
          content: "",
          content_type: "text",
          language: "",
          file_extension: "",
          tags: [],
          metadata: {},
          thread_id: threadId
        })
      }
    } catch (error) {
      toast.error("Failed to create artifact")
    }
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }))
    }
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault()
      addTag(newTag)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Artifact</DialogTitle>
          <DialogDescription>
            Save important code, text, or other content as a reusable artifact.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter artifact title..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the artifact..."
            />
          </div>

          {/* Content Type and Language */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="content_type">Content Type</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language/Extension</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                placeholder="e.g., javascript, .js"
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter your content here..."
              className="min-h-[200px] font-mono text-sm"
              required
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="space-y-2">
              {/* Current tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add new tag */}
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTag(newTag)}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </div>

              {/* Common tags */}
              <div className="flex flex-wrap gap-1">
                {COMMON_TAGS.filter(tag => !formData.tags.includes(tag)).slice(0, 6).map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => addTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Artifact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
