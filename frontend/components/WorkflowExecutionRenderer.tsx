"use client"

import { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronRight,
  Workflow,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Sparkles,
  Play,
  Pause,
} from "lucide-react"
import { Button } from "@/frontend/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/frontend/components/ui/collapsible"
import { Badge } from "@/frontend/components/ui/badge"
import { Progress } from "@/frontend/components/ui/progress"
import { cn } from "@/lib/utils"
import MarkdownRenderer from "@/frontend/components/MemoizedMarkdown"

interface WorkflowStep {
  stepNumber: number
  name: string
  description?: string
  status: "pending" | "processing" | "completed" | "failed"
  content?: string
  webSearchEnabled?: boolean
  sources?: any[]
}

interface WorkflowExecutionRendererProps {
  content: string
  isStreaming: boolean
  sources?: any[]
  className?: string
}

export function WorkflowExecutionRenderer({
  content,
  isStreaming,
  sources,
  className,
}: WorkflowExecutionRendererProps) {
  const [workflowName, setWorkflowName] = useState<string>("")
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set())
  const [isCompleted, setIsCompleted] = useState(false)

  // Parse workflow content
  useEffect(() => {
    parseWorkflowContent(content)
  }, [content])

  const parseWorkflowContent = (content: string) => {
    const lines = content.split("\n")
    let currentWorkflowName = ""
    const currentSteps: WorkflowStep[] = []
    let currentStep: Partial<WorkflowStep> | null = null
    let currentContent = ""
    let completed = false
    let inStepContent = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Extract workflow name
      if (line.includes("🚀") && (line.includes("Executing workflow:") || line.includes("Starting workflow:"))) {
        const match = line.match(/🚀.*?(?:Executing|Starting)\s+workflow:\s*(.+?)(?:\s*\*\*)?$/i)
        if (match) {
          currentWorkflowName = match[1].replace(/\*\*/g, "").trim()
        }
      }

      // Extract step information
      if (line.match(/⚡\s*\*\*Step\s+(\d+):\s*(.+?)\*\*/)) {
        // Save previous step if exists
        if (currentStep) {
          currentSteps.push({
            ...currentStep,
            content: currentContent.trim(),
          } as WorkflowStep)
        }

        // Start new step
        const match = line.match(/⚡\s*\*\*Step\s+(\d+):\s*(.+?)\*\*/)
        if (match) {
          currentStep = {
            stepNumber: Number.parseInt(match[1]),
            name: match[2].trim(),
            status: "processing",
          }
          currentContent = ""
          inStepContent = true
        }
      }

      // Check for processing indicators
      if (line.includes("🤖 **Processing with AI...**")) {
        if (currentStep) {
          currentStep.status = "processing"
        }
        continue
      }

      // Check for web search
      if (line.includes("🔍") && line.toLowerCase().includes("search")) {
        if (currentStep) {
          currentStep.webSearchEnabled = true
          if (sources && sources.length > 0 && !currentStep.sources) {
            currentStep.sources = sources
          }
        }
        continue
      }

      // Check for completion
      if (line.includes("🎉") && line.toLowerCase().includes("completed")) {
        completed = true
        if (currentStep) {
          currentStep.status = "completed"
        }
        continue
      }

      // Check for step completion indicators
      if (line.includes("✅") || (line.includes("**Result:**") && currentStep)) {
        if (currentStep) {
          currentStep.status = "completed"
        }
      }

      // Collect content for current step
      if (currentStep && inStepContent && line.trim()) {
        if (
          !line.match(/⚡\s*\*\*Step\s+\d+/) &&
          !line.includes("🚀") &&
          !line.includes("🤖 **Processing with AI...**") &&
          !line.includes("🔍") &&
          !line.includes("🎉") &&
          !line.match(/^---+$/)
        ) {
          currentContent += line + "\n"
        }
      }
    }

    // Save last step
    if (currentStep) {
      currentSteps.push({
        ...currentStep,
        content: currentContent.trim(),
      } as WorkflowStep)
    }

    // Update state
    setWorkflowName(currentWorkflowName)
    setSteps(currentSteps)
    setIsCompleted(completed)

    // Auto-open the currently processing step or the first step if streaming
    if (isStreaming) {
      const processingStep = currentSteps.find((step) => step.status === "processing")
      if (processingStep) {
        setOpenSteps(new Set([processingStep.stepNumber]))
      } else if (currentSteps.length > 0) {
        setOpenSteps(new Set([currentSteps[currentSteps.length - 1].stepNumber]))
      }
    }
  }

  const toggleStep = (stepNumber: number) => {
    const newOpenSteps = new Set(openSteps)
    if (newOpenSteps.has(stepNumber)) {
      newOpenSteps.delete(stepNumber)
    } else {
      newOpenSteps.add(stepNumber)
    }
    setOpenSteps(newOpenSteps)
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "processing":
        return (
          <div className="relative">
            <Clock className="h-4 w-4 text-primary animate-spin" />
            <div className="absolute inset-0 h-4 w-4 bg-primary/20 rounded-full animate-ping" />
          </div>
        )
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/50" />
    }
  }

  const completedSteps = steps.filter((step) => step.status === "completed").length
  const totalSteps = steps.length
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  return (
    <div className={cn("space-y-4 max-w-4xl", className)}>
      {/* Workflow Header */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Workflow className="h-5 w-5 text-primary" />
                {isStreaming && !isCompleted && (
                  <div className="absolute -inset-1 bg-primary/20 rounded-full animate-ping" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{workflowName || "Workflow Execution"}</h3>
                <p className="text-sm text-muted-foreground">
                  {isCompleted ? "Completed successfully" : isStreaming ? "In progress..." : "Ready to execute"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {totalSteps > 0 && (
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {completedSteps}/{totalSteps} steps
                  </div>
                  <div className="text-xs text-muted-foreground">{Math.round(progressPercentage)}% complete</div>
                </div>
              )}

              {isCompleted ? (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              ) : isStreaming ? (
                <Badge variant="secondary" className="animate-pulse">
                  <Play className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Pause className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
          </div>

          {totalSteps > 0 && (
            <div className="mt-3">
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <Collapsible
            key={step.stepNumber}
            open={openSteps.has(step.stepNumber)}
            onOpenChange={() => toggleStep(step.stepNumber)}
          >
            <div
              className={cn(
                "relative overflow-hidden rounded-lg border transition-all duration-200",
                step.status === "completed" &&
                  "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10",
                step.status === "processing" && "border-primary/50 bg-primary/5 shadow-sm",
                step.status === "failed" && "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10",
                step.status === "pending" && "border-border bg-card",
              )}
            >
              {/* Step connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-6 top-12 w-0.5 h-6 -mb-6 z-0",
                    step.status === "completed" ? "bg-green-300 dark:bg-green-700" : "bg-border",
                  )}
                />
              )}

              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-4 h-auto hover:bg-accent/50 relative z-10">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex items-center gap-3">
                      {openSteps.has(step.stepNumber) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}

                      {getStepIcon(step.status)}
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          Step {step.stepNumber}: {step.name}
                        </span>
                        {step.webSearchEnabled && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full">
                            <Search className="h-3 w-3 text-primary" />
                            <span className="text-xs text-primary font-medium">Web Search</span>
                          </div>
                        )}
                      </div>
                      {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
                    </div>

                    <Badge
                      variant={
                        step.status === "completed" ? "default" : step.status === "processing" ? "secondary" : "outline"
                      }
                      className={cn(
                        "ml-auto",
                        step.status === "completed" &&
                          "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
                        step.status === "processing" && isStreaming && "animate-pulse",
                      )}
                    >
                      {step.status === "processing" && isStreaming ? (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 bg-current rounded-full animate-pulse" />
                          Processing...
                        </div>
                      ) : (
                        <span className="capitalize">{step.status}</span>
                      )}
                    </Badge>
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                <div className="ml-11 pt-2">
                  <div className="border-l-2 border-border pl-4">
                    {step.status === "processing" && isStreaming && !step.content ? (
                      <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="relative">
                          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                          <div className="absolute inset-0 h-5 w-5 bg-primary/20 rounded-full animate-ping" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Processing with AI...</div>
                          <div className="text-sm text-muted-foreground">
                            Generating response using artificial intelligence
                          </div>
                        </div>
                      </div>
                    ) : step.content ? (
                      <div className="space-y-3">
                        {step.webSearchEnabled && step.sources && step.sources.length > 0 && (
                          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Search className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-foreground">Web Search Results</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Found {step.sources.length} relevant sources
                            </div>
                          </div>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none bg-card rounded-lg p-4 border border-border">
                          <MarkdownRenderer content={step.content} id={`workflow-step-${step.stepNumber}`} />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="text-sm text-muted-foreground text-center">
                          No content available for this step
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {/* Completion Status */}
      {isCompleted && (
        <div className="relative overflow-hidden rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-ping" />
              </div>
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100">
                  🎉 Workflow completed successfully!
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  All {totalSteps} steps executed successfully
                </div>
              </div>
              <div className="ml-auto">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
