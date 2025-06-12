"use client"

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
import { usePersonas } from "@/frontend/hooks/usePersonas"
import { toast } from "sonner"
import type { Persona } from "@/lib/supabase/types"

interface EditPersonaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  persona: Persona | null
}

const EMOJI_OPTIONS = ["🤖", "👨‍🏫", "👩‍💻", "🎨", "📝", "🔬", "💡", "🎭", "🧠", "⚡", "🌟", "🚀"]
const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", 
  "#eab308", "#22c55e", "#10b981", "#06b6d4", "#3b82f6"
]

export function EditPersonaDialog({ open, onOpenChange, persona }: EditPersonaDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    system_prompt: "",
    avatar_emoji: "🤖",
    color: "#6366f1",
    is_default: false,
    is_public: false,
  })
  const [loading, setLoading] = useState(false)
  const { updatePersona } = usePersonas()

  // Update form data when persona changes
  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name || "",
        description: persona.description || "",
        system_prompt: persona.system_prompt || "",
        avatar_emoji: persona.avatar_emoji || "🤖",
        color: persona.color || "#6366f1",
        is_default: persona.is_default || false,
        is_public: persona.is_public || false,
      })
    }
  }, [persona])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!persona) return
    
    if (!formData.name.trim() || !formData.system_prompt.trim()) {
      toast.error("Name and system prompt are required")
      return
    }

    setLoading(true)
    try {
      await updatePersona(persona.id, formData)
      toast.success("Persona updated successfully!")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to update persona")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Persona</DialogTitle>
          <DialogDescription>
            Modify this AI persona's behavior and personality.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Code Reviewer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Avatar</Label>
              <div className="flex flex-wrap gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={formData.avatar_emoji === emoji ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setFormData({ ...formData, avatar_emoji: emoji })}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this persona's role"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt *</Label>
            <Textarea
              id="system_prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              placeholder="You are a helpful assistant that..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color Theme</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <Button
                  key={color}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0 border-2"
                  style={{ 
                    backgroundColor: formData.color === color ? color : 'transparent',
                    borderColor: color 
                  }}
                  onClick={() => setFormData({ ...formData, color })}
                >
                  {formData.color === color && <span className="text-white">✓</span>}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
              <Label htmlFor="is_default">Set as default persona</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label htmlFor="is_public">Make public</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Persona"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
