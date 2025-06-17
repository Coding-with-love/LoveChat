"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ScrollArea } from "./ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Switch } from "./ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"
import { useWorkflowStore } from "@/frontend/stores/WorkflowStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useWebSearchStore } from "@/frontend/stores/WebSearchStore"
import { toast } from "sonner"
import {
  Plus,
  Play,
  Save,
  Trash2,
  Copy,
  Edit,
  MoreVertical,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  FileText,
  Code,
  MessageSquare,
  Briefcase,
  Star,
  Search,
  Wand2,
} from "lucide-react"
import type { Workflow, WorkflowStep, WorkflowTemplate } from "@/lib/types/workflow"
import { v4 as uuidv4 } from "uuid"
import { GenerateWorkflowDialog } from "./GenerateWorkflowDialog"

interface WorkflowBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadId?: string
  onRefreshMessages?: () => void
}

export function WorkflowBuilder({ open, onOpenChange, threadId, onRefreshMessages }: WorkflowBuilderProps) {
  const {
    workflows,
    templates,
    executions,
    isLoading,
    fetchWorkflows,
    fetchTemplates,
    fetchExecutions,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    executeWorkflowInChat,
    selectedWorkflow,
    setSelectedWorkflow,
  } = useWorkflowStore()

  const { selectedModel } = useModelStore()
  const { enabled: webSearchEnabled } = useWebSearchStore()

  const [activeTab, setActiveTab] = useState("my-workflows")
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null)
  const [executionInputs, setExecutionInputs] = useState<Record<string, any>>({})
  const [showExecutionDialog, setShowExecutionDialog] = useState(false)
  const [workflowToExecute, setWorkflowToExecute] = useState<Workflow | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  useEffect(() => {
    if (open) {
      fetchWorkflows()
      fetchTemplates()
      fetchExecutions()
    }
  }, [open, fetchWorkflows, fetchTemplates, fetchExecutions])

  const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
    try {
      const newWorkflow = await createWorkflow({
        name: `${template.name} (Copy)`,
        description: template.description,
        steps: template.steps,
        is_public: false,
        tags: template.tags,
      })
      setEditingWorkflow(newWorkflow)
      setIsEditing(true)
      setActiveTab("editor")
      toast.success("Workflow created from template")
    } catch (error) {
      toast.error("Failed to create workflow")
    }
  }

  const handleCreateNew = () => {
    const newWorkflow: Workflow = {
      id: "",
      user_id: "",
      name: "New Workflow",
      description: "",
      steps: [
        {
          id: uuidv4(),
          name: "Step 1",
          prompt: "Enter your prompt here...",
          description: "Describe what this step does",
          outputVariable: "step1_output",
        },
      ],
      is_public: false,
      tags: [],
      created_at: "",
      updated_at: "",
    }
    setEditingWorkflow(newWorkflow)
    setIsEditing(true)
    setActiveTab("editor")
  }

  const handleWorkflowGenerated = (workflow: Workflow) => {
    setEditingWorkflow(workflow)
    setIsEditing(true)
    setActiveTab("editor")
    fetchWorkflows() // Refresh the workflows list
  }

  const handleSaveWorkflow = async () => {
    if (!editingWorkflow) return

    try {
      if (editingWorkflow.id) {
        await updateWorkflow(editingWorkflow.id, editingWorkflow)
        toast.success("Workflow updated")
      } else {
        await createWorkflow(editingWorkflow)
        toast.success("Workflow created")
      }
      setIsEditing(false)
      setEditingWorkflow(null)
      setActiveTab("my-workflows")
    } catch (error) {
      toast.error("Failed to save workflow")
    }
  }

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return

    try {
      await deleteWorkflow(workflowToDelete.id)
      toast.success("Workflow deleted")
      setDeleteConfirmOpen(false)
      setWorkflowToDelete(null)
    } catch (error) {
      toast.error("Failed to delete workflow")
    }
  }

  const handleExecuteWorkflow = async () => {
    if (!workflowToExecute || !threadId) return

    try {
      const result = await executeWorkflowInChat(workflowToExecute.id, executionInputs, threadId, selectedModel, webSearchEnabled, onRefreshMessages)
      
      // Send the workflow message to chat
      // We need to get the chat append function from the parent component
      // For now, we'll use a custom event to communicate with the chat
      const event = new CustomEvent('sendWorkflowMessage', {
        detail: {
          message: result.message,
          executionData: result.executionData
        }
      })
      window.dispatchEvent(event)
      
      toast.success("Workflow started in chat")
      setShowExecutionDialog(false)
      setWorkflowToExecute(null)
      setExecutionInputs({})
      onOpenChange(false) // Close the workflow builder dialog
    } catch (error) {
      toast.error("Failed to execute workflow")
    }
  }

  const extractVariables = (steps: WorkflowStep[]): string[] => {
    const variables = new Set<string>()
    const outputVariables = new Set<string>()
    
    // First, collect all output variables
    steps.forEach((step) => {
      if (step.outputVariable) {
        outputVariables.add(step.outputVariable)
      }
    })
    
    // Then extract all variables that are NOT output variables (these are user inputs)
    steps.forEach((step) => {
      const matches = step.prompt.match(/{{(\w+)}}/g)
      if (matches) {
        matches.forEach((match) => {
          const variable = match.replace(/[{}]/g, "")
          // Only include variables that are not output variables from other steps
          if (!outputVariables.has(variable)) {
            variables.add(variable)
          }
        })
      }
    })
    return Array.from(variables)
  }

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "content creation":
        return <FileText className="h-4 w-4" />
      case "marketing":
        return <Sparkles className="h-4 w-4" />
      case "customer service":
        return <MessageSquare className="h-4 w-4" />
      case "development":
        return <Code className="h-4 w-4" />
      default:
        return <Briefcase className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl lg:max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Workflow Builder
          </DialogTitle>
          <DialogDescription>Create and manage AI workflow pipelines to automate complex tasks</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 flex-shrink-0 mb-4">
            <TabsTrigger value="my-workflows" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">My Workflows</span>
              <span className="sm:hidden">Workflows</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs sm:text-sm">Templates</TabsTrigger>
            <TabsTrigger value="executions" className="text-xs sm:text-sm">Executions</TabsTrigger>
            <TabsTrigger value="editor" className="text-xs sm:text-sm">Editor</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="my-workflows" className="h-full flex flex-col overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold">Your Workflows</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={() => setShowGenerateDialog(true)} 
                    variant="outline" 
                    className="flex items-center gap-2 justify-center"
                    size="sm"
                  >
                    <Wand2 className="h-4 w-4" />
                    <span className="hidden xs:inline">Generate with AI</span>
                    <span className="xs:hidden">Generate</span>
                  </Button>
                  <Button onClick={handleCreateNew} className="flex items-center gap-2 justify-center" size="sm">
                    <Plus className="h-4 w-4" />
                    <span className="hidden xs:inline">New Workflow</span>
                    <span className="xs:hidden">New</span>
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="grid gap-4 pb-6">
                  {workflows.map((workflow) => (
                    <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{workflow.name}</CardTitle>
                            {workflow.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{workflow.description}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  const variables = extractVariables(workflow.steps)
                                  if (variables.length > 0) {
                                    setWorkflowToExecute(workflow)
                                    setShowExecutionDialog(true)
                                  } else if (threadId) {
                                    executeWorkflowInChat(workflow.id, {}, threadId, selectedModel, webSearchEnabled, onRefreshMessages).then(result => {
                                      const event = new CustomEvent('sendWorkflowMessage', {
                                        detail: {
                                          message: result.message,
                                          executionData: result.executionData
                                        }
                                      })
                                      window.dispatchEvent(event)
                                      toast.success("Workflow started in chat")
                                      onOpenChange(false)
                                    }).catch(() => {
                                      toast.error("Failed to execute workflow")
                                    })
                                  } else {
                                    toast.error("Please open this from a chat thread")
                                  }
                                }}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Execute in Chat
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingWorkflow(workflow)
                                  setIsEditing(true)
                                  setActiveTab("editor")
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setWorkflowToDelete(workflow)
                                  setDeleteConfirmOpen(true)
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <Badge variant="secondary" className="flex-shrink-0">
                              {workflow.steps.length} step{workflow.steps.length !== 1 ? "s" : ""}
                            </Badge>
                            <div className="flex items-center gap-1 flex-wrap min-w-0">
                              {workflow.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs truncate">
                                  {tag}
                                </Badge>
                              ))}
                              {workflow.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{workflow.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-shrink-0"
                            onClick={() => {
                              const variables = extractVariables(workflow.steps)
                              if (variables.length > 0) {
                                setWorkflowToExecute(workflow)
                                setShowExecutionDialog(true)
                              } else if (threadId) {
                                executeWorkflowInChat(workflow.id, {}, threadId, selectedModel, webSearchEnabled, onRefreshMessages).then(result => {
                                  const event = new CustomEvent('sendWorkflowMessage', {
                                    detail: {
                                      message: result.message,
                                      executionData: result.executionData
                                    }
                                  })
                                  window.dispatchEvent(event)
                                  toast.success("Workflow started in chat")
                                  onOpenChange(false)
                                }).catch(() => {
                                  toast.error("Failed to execute workflow")
                                })
                              } else {
                                toast.error("Please open this from a chat thread")
                              }
                            }}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Run in Chat
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates" className="h-full flex flex-col overflow-hidden">
              <div className="mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold">Workflow Templates</h3>
                <p className="text-sm text-muted-foreground">Start with pre-built workflows for common tasks</p>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="grid gap-4 pb-6">
                  {templates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {template.is_featured && <Star className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                {getCategoryIcon(template.category || "")}
                                <span className="truncate">{template.name}</span>
                              </CardTitle>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                              )}
                              {template.category && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {template.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleCreateFromTemplate(template)}
                            className="flex items-center gap-2 flex-shrink-0"
                            size="sm"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="hidden sm:inline">Use Template</span>
                            <span className="sm:hidden">Use</span>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {template.steps.length} step{template.steps.length !== 1 ? "s" : ""}
                            </Badge>
                            {template.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="executions" className="h-full flex flex-col overflow-hidden">
              <div className="mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold">Execution History</h3>
                <p className="text-sm text-muted-foreground">Track your workflow runs and results</p>
                {/* Debug info */}
                <div className="text-xs text-muted-foreground mt-2">
                  Debug: {executions.length} executions loaded, Loading: {isLoading ? 'Yes' : 'No'}
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pb-6">
                  {executions.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Executions Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Execute workflows to see their history here
                        </p>
                        <div className="text-sm text-muted-foreground">
                          Total executions: {executions.length}
                        </div>
                      </div>
                    </div>
                  ) : (
                    executions.map((execution) => {
                      const workflow = workflows.find((w) => w.id === execution.workflow_id)
                      return (
                        <Card key={execution.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(execution.status)}
                                  <span className="font-medium">{workflow?.name || "Unknown Workflow"}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {execution.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Started {new Date(execution.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">
                                  Step {execution.current_step + 1} of {execution.step_results.length}
                                </div>
                                {execution.completed_at && (
                                  <div className="text-xs text-muted-foreground">
                                    Completed {new Date(execution.completed_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>

                            {execution.error_message && (
                              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                {execution.error_message}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="editor" className="h-full flex flex-col overflow-hidden">
              {editingWorkflow ? (
                <WorkflowEditor
                  workflow={editingWorkflow}
                  onChange={setEditingWorkflow}
                  onSave={handleSaveWorkflow}
                  onCancel={() => {
                    setIsEditing(false)
                    setEditingWorkflow(null)
                    setActiveTab("my-workflows")
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Workflow Selected</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a new workflow or edit an existing one to get started
                    </p>
                    <Button onClick={handleCreateNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Workflow
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Execution Input Dialog */}
        <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
          <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Execute Workflow in Chat</DialogTitle>
              <DialogDescription>
                Provide input values for the workflow variables. The workflow will execute in the current chat thread.
              </DialogDescription>
            </DialogHeader>

            {workflowToExecute && (
              <div className="space-y-4">
                {/* Show execution settings */}
                <div className="bg-muted/50 rounded-lg p-3 flex-shrink-0">
                  <h4 className="text-sm font-medium mb-2">Execution Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">{selectedModel}</span>
                      <div className="text-xs opacity-75">Model</div>
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">{webSearchEnabled ? "Enabled" : "Disabled"}</span>
                      <div className="text-xs opacity-75">Web Search</div>
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">{workflowToExecute.steps.length}</span>
                      <div className="text-xs opacity-75">Steps</div>
                    </div>
                  </div>
                </div>

                {/* Scrollable variables section */}
                <div className="max-h-[50vh] overflow-y-auto">
                  <div className="space-y-4 pr-2">
                    {/* Input variables */}
                    {extractVariables(workflowToExecute.steps).map((variable) => (
                      <div key={variable} className="space-y-2">
                        <Label htmlFor={variable} className="text-sm font-medium">
                          {variable.replace(/([A-Z_])/g, " $1").trim().replace(/^\w/, c => c.toUpperCase())}
                        </Label>
                        <Textarea
                          id={variable}
                          value={executionInputs[variable] || ""}
                          onChange={(e) =>
                            setExecutionInputs((prev) => ({
                              ...prev,
                              [variable]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${variable.replace(/([A-Z_])/g, " $1").trim().toLowerCase()}...`}
                          className="min-h-[80px] resize-none"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fixed footer with buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowExecutionDialog(false)} className="sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleExecuteWorkflow} className="sm:w-auto">
                    <Play className="h-4 w-4 mr-2" />
                    Execute in Chat
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{workflowToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteWorkflow} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Generate Workflow Dialog */}
        <GenerateWorkflowDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          onWorkflowGenerated={handleWorkflowGenerated}
        />
      </DialogContent>
    </Dialog>
  )
}

interface WorkflowEditorProps {
  workflow: Workflow
  onChange: (workflow: Workflow) => void
  onSave: () => void
  onCancel: () => void
}

function WorkflowEditor({ workflow, onChange, onSave, onCancel }: WorkflowEditorProps) {
  const addStep = () => {
    const newStep: WorkflowStep = {
      id: uuidv4(),
      name: `Step ${workflow.steps.length + 1}`,
      prompt: "Enter your prompt here...",
      description: "Describe what this step does",
      outputVariable: `step${workflow.steps.length + 1}_output`,
    }
    onChange({
      ...workflow,
      steps: [...workflow.steps, newStep],
    })
  }

  const updateStep = (index: number, step: WorkflowStep) => {
    const newSteps = [...workflow.steps]
    const oldStep = newSteps[index]
    
    // Auto-generate output variable if not set
    if (!step.outputVariable) {
      step.outputVariable = `step${index + 1}_output`
    }
    
    // Check for variable replacements in the prompt
    if (oldStep.prompt !== step.prompt) {
      checkAndReplaceVariables(newSteps, oldStep.prompt, step.prompt, index)
    }
    
    newSteps[index] = step
    
    // If the output variable changed, update all references in subsequent steps
    if (oldStep.outputVariable && oldStep.outputVariable !== step.outputVariable) {
      updateVariableReferences(newSteps, oldStep.outputVariable, step.outputVariable || '', index)
    }
    
    onChange({
      ...workflow,
      steps: newSteps,
    })
  }

  // Helper function to update variable references across steps
  const updateVariableReferences = (steps: WorkflowStep[], oldVariable: string, newVariable: string, fromIndex: number) => {
    for (let i = fromIndex + 1; i < steps.length; i++) {
      const step = steps[i]
      // Update references in the prompt
      if (step.prompt.includes(`{{${oldVariable}}}`)) {
        step.prompt = step.prompt.replace(
          new RegExp(`{{${oldVariable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}}}`, 'g'),
          newVariable ? `{{${newVariable}}}` : ''
        )
      }
    }
  }

  // TODO: Implement variable replacement functionality
  const checkAndReplaceVariables = (steps: WorkflowStep[], oldPrompt: string, newPrompt: string, currentIndex: number) => {
    // Placeholder for future implementation
  }

  // Get available variables from previous steps and all input variables
  const getAvailableVariables = (currentStepIndex: number): string[] => {
    const variables = new Set<string>()
    
    // Add output variables from previous steps
    for (let i = 0; i < currentStepIndex; i++) {
      const step = workflow.steps[i]
      if (step.outputVariable) {
        variables.add(step.outputVariable)
      }
    }
    
    // Add all input variables found in any step (these are user inputs)
    // Extract input variables inline to avoid scope issues
    const outputVariables = new Set<string>()
    workflow.steps.forEach((step) => {
      if (step.outputVariable) {
        outputVariables.add(step.outputVariable)
      }
    })
    
    workflow.steps.forEach((step) => {
      const matches = step.prompt.match(/{{(\w+)}}/g)
      if (matches) {
        matches.forEach((match) => {
          const variable = match.replace(/[{}]/g, "")
          if (!outputVariables.has(variable)) {
            variables.add(variable)
          }
        })
      }
    })
    
    return Array.from(variables)
  }

  // Get steps that use a specific variable
  const getStepsUsingVariable = (variable: string, fromIndex: number): number[] => {
    const usingSteps: number[] = []
    for (let i = fromIndex + 1; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]
      if (step.prompt.includes(`{{${variable}}}`)) {
        usingSteps.push(i)
      }
    }
    return usingSteps
  }

  const removeStep = (index: number) => {
    onChange({
      ...workflow,
      steps: workflow.steps.filter((_, i) => i !== index),
    })
  }

  const moveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...workflow.steps]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if (targetIndex >= 0 && targetIndex < newSteps.length) {
      ;[newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]
      onChange({
        ...workflow,
        steps: newSteps,
      })
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">Workflow Editor</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 pb-6">
          {/* Workflow Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workflow-name">Name</Label>
                <Input
                  id="workflow-name"
                  value={workflow.name}
                  onChange={(e) => onChange({ ...workflow, name: e.target.value })}
                  placeholder="Enter workflow name..."
                />
              </div>
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflow.description || ""}
                  onChange={(e) => onChange({ ...workflow, description: e.target.value })}
                  placeholder="Describe what this workflow does..."
                />
              </div>
              <div>
                <Label htmlFor="workflow-tags">Tags (comma-separated)</Label>
                <Input
                  id="workflow-tags"
                  value={workflow.tags.join(", ")}
                  onChange={(e) =>
                    onChange({
                      ...workflow,
                      tags: e.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="automation, content, marketing..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Workflow Steps */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Workflow Steps</CardTitle>
                <Button onClick={addStep} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflow.steps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="outline">Step {index + 1}</Badge>
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(index, { ...step, name: e.target.value })}
                          className="font-medium flex-1"
                          placeholder="Step name..."
                        />
                        <Badge variant="secondary" className="text-xs">
                          Output: {step.outputVariable || `step${index + 1}_output`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => moveStep(index, "up")} disabled={index === 0}>
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStep(index, "down")}
                          disabled={index === workflow.steps.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={step.description || ""}
                          onChange={(e) => updateStep(index, { ...step, description: e.target.value })}
                          placeholder="What does this step do?"
                        />
                      </div>
                      <div>
                        <Label>Prompt</Label>
                        <Textarea
                          id={`prompt-${step.id}`}
                          value={step.prompt}
                          onChange={(e) => updateStep(index, { ...step, prompt: e.target.value })}
                          placeholder="Enter the AI prompt for this step..."
                          rows={4}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            Use {`{{variable}}`} to reference inputs or previous step outputs
                          </p>
                          <div className="flex items-center gap-2">
                            <Search className="h-3 w-3 text-muted-foreground" />
                            <Label htmlFor={`web-search-${step.id}`} className="text-xs">
                              Web Search
                            </Label>
                            <Switch
                              id={`web-search-${step.id}`}
                              checked={step.webSearchEnabled || false}
                              onCheckedChange={(checked) => updateStep(index, { ...step, webSearchEnabled: checked })}
                              className="scale-75"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {index < workflow.steps.length - 1 && (
                      <div className="flex justify-center mt-4">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
