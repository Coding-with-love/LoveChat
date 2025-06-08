"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { createProject, updateProject } from "@/lib/supabase/queries"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Database } from "@/lib/supabase/types"

// Define the Project type based on the Database type
type Project = Database["public"]["Tables"]["projects"]["Row"]

const PROJECT_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
]

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingProject?: Project | null
  onSuccess?: () => void // Callback to refresh data
}

export function CreateProjectDialog({ open, onOpenChange, existingProject, onSuccess }: CreateProjectDialogProps) {
  const [name, setName] = useState(existingProject?.name || "")
  const [description, setDescription] = useState(existingProject?.description || "")
  const [color, setColor] = useState(existingProject?.color || "#3b82f6")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    if (!existingProject) {
      setName("")
      setDescription("")
      setColor("#3b82f6")
    } else {
      setName(existingProject.name)
      setDescription(existingProject.description || "")
      setColor(existingProject.color || "#3b82f6")
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Project name required", {
        description: "Please enter a name for your project",
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (existingProject) {
        await updateProject(existingProject.id, {
          name,
          description: description || null,
          color,
        })
        toast.success("Project updated", {
          description: `${name} has been updated successfully`,
        })
      } else {
        await createProject(name, description || null, color)
        toast.success("Project created", {
          description: `${name} has been created successfully`,
        })
      }

      // Call the success callback to refresh data
      onSuccess?.()
      handleOpenChange(false)
    } catch (error) {
      console.error("Error creating/updating project:", error)
      toast.error(`Failed to ${existingProject ? "update" : "create"} project`, {
        description: "Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingProject ? "Edit Project" : "Create Project"}</DialogTitle>
          <DialogDescription>
            {existingProject
              ? "Update your project details below."
              : "Create a new project to organize your conversations."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your project"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((projectColor) => (
                  <button
                    key={projectColor.value}
                    type="button"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 ${
                      color === projectColor.value ? "border-primary scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: projectColor.value }}
                    onClick={() => setColor(projectColor.value)}
                    title={projectColor.name}
                    aria-label={`Select ${projectColor.name} color`}
                  >
                    {color === projectColor.value && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {existingProject ? "Updating..." : "Creating..."}
                </>
              ) : existingProject ? (
                "Update Project"
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
