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
import { cn } from "@/lib/utils"

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
          <div className="grid gap-6 py-4">
            {/* Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <span className="text-lg">📝</span>
                <h4 className="text-sm font-semibold text-foreground">Details</h4>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter project name"
                    autoComplete="off"
                    required
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description for your project"
                    rows={3}
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* Color Label Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <span className="text-lg">🎨</span>
                <h4 className="text-sm font-semibold text-foreground">Color Label</h4>
              </div>
              <div className="grid gap-3">
                <Label className="text-sm font-medium">Choose a color for your project</Label>
                <div className="flex flex-wrap gap-3">
                  {PROJECT_COLORS.map((projectColor) => (
                    <div key={projectColor.value} className="relative group">
                      <button
                        type="button"
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50",
                          color === projectColor.value
                            ? "border-primary scale-110 shadow-lg"
                            : "border-transparent hover:border-border",
                        )}
                        style={{ backgroundColor: projectColor.value }}
                        onClick={() => setColor(projectColor.value)}
                        title={`${projectColor.name} (${projectColor.value})`}
                        aria-label={`Select ${projectColor.name} color`}
                      >
                        {color === projectColor.value && (
                          <Check className="h-4 w-4 text-white drop-shadow-sm animate-in zoom-in-50 duration-200" />
                        )}
                      </button>
                      {/* Tooltip */}
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded-md shadow-md border whitespace-nowrap">
                          {projectColor.name}
                          <div className="text-xs text-muted-foreground">{projectColor.value}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="hover:bg-secondary transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="relative overflow-hidden group hover:shadow-lg transition-all duration-200 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {existingProject ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <span className="relative z-10">{existingProject ? "Update Project" : "Create Project"}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
