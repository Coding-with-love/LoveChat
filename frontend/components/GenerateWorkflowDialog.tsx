"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { useWorkflowStore } from "@/frontend/stores/WorkflowStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { toast } from "sonner"
import { Sparkles, Loader2, Wand2 } from "lucide-react"
import type { Workflow } from "@/lib/types/workflow"

interface GenerateWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorkflowGenerated: (workflow: Workflow) => void
}

export function GenerateWorkflowDialog({ open, onOpenChange, onWorkflowGenerated }: GenerateWorkflowDialogProps) {
  const [description, setDescription] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const { generateWorkflow, createWorkflow } = useWorkflowStore()
  const { selectedModel } = useModelStore()

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please describe what workflow you want to create")
      return
    }

    setIsGenerating(true)
    try {
      console.log('🤖 Generating workflow with model:', selectedModel)
      
      // Generate the workflow using AI
      const generatedWorkflow = await generateWorkflow(description.trim(), selectedModel)
      
      console.log('✅ Generated workflow:', generatedWorkflow)
      
      // Create the workflow in the database
      const savedWorkflow = await createWorkflow(generatedWorkflow)
      
      toast.success(`Created workflow: ${savedWorkflow.name}`)
      
      // Pass the saved workflow to the parent
      onWorkflowGenerated(savedWorkflow)
      
      // Reset form and close dialog
      setDescription("")
      onOpenChange(false)
    } catch (error) {
      console.error('❌ Workflow generation failed:', error)
      toast.error(error instanceof Error ? error.message : "Failed to generate workflow")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      setDescription("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generate Workflow with AI
          </DialogTitle>
          <DialogDescription>
            Describe the workflow you want to create and AI will build it for you with multiple steps and proper variable handling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="workflow-description">What workflow do you want to create?</Label>
            <Textarea
              id="workflow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: I want to create a content marketing workflow that researches a topic, creates an outline, writes a blog post, and generates social media posts..."
              className="min-h-32 mt-2"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Be specific about what you want to achieve. The AI will create a multi-step workflow with proper input/output variables.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Using Model:</Label>
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              {selectedModel}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Examples:</Label>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>• "Create a customer support workflow that analyzes the inquiry, determines urgency, and drafts a response"</div>
              <div>• "Build a content creation workflow that researches trends, generates ideas, and creates outlines"</div>
              <div>• "Make a product launch workflow that analyzes competitors, creates messaging, and plans campaigns"</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Workflow
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 