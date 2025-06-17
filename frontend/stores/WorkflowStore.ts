import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workflow, WorkflowTemplate, WorkflowExecution } from '@/lib/types/workflow'
import { getAuthHeaders } from '@/lib/auth-headers'

interface WorkflowStore {
  workflows: Workflow[]
  templates: WorkflowTemplate[]
  executions: WorkflowExecution[]
  isLoading: boolean
  
  // Actions
  fetchWorkflows: () => Promise<void>
  fetchTemplates: () => Promise<void>
  fetchExecutions: () => Promise<void>
  createWorkflow: (workflow: Omit<Workflow, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Workflow>
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  executeWorkflow: (workflowId: string, inputData: Record<string, any>, threadId?: string) => Promise<WorkflowExecution>
  executeWorkflowInChat: (workflowId: string, inputData: Record<string, any>, threadId: string, selectedModel: string, webSearchEnabled: boolean, onRefresh?: () => void) => Promise<{ message: string, executionData: any }>
  cancelExecution: (executionId: string) => Promise<void>
  generateWorkflow: (description: string, selectedModel: string) => Promise<Omit<Workflow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  
  // UI State
  selectedWorkflow: Workflow | null
  setSelectedWorkflow: (workflow: Workflow | null) => void
  isWorkflowBuilderOpen: boolean
  setWorkflowBuilderOpen: (open: boolean) => void
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      workflows: [],
      templates: [],
      executions: [],
      isLoading: false,
      selectedWorkflow: null,
      isWorkflowBuilderOpen: false,

      setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
      setWorkflowBuilderOpen: (open) => set({ isWorkflowBuilderOpen: open }),

      fetchWorkflows: async () => {
        set({ isLoading: true })
        try {
          const headers = await getAuthHeaders()
          const response = await fetch('/api/workflows', { headers })
          if (response.ok) {
            const workflows = await response.json()
            set({ workflows })
          }
        } catch (error) {
          console.error('Failed to fetch workflows:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      fetchTemplates: async () => {
        try {
          const headers = await getAuthHeaders()
          const response = await fetch('/api/workflows/templates', { headers })
          if (response.ok) {
            const templates = await response.json()
            set({ templates })
          }
        } catch (error) {
          console.error('Failed to fetch workflow templates:', error)
        }
      },

      fetchExecutions: async () => {
        try {
          console.log('🔍 Fetching workflow executions...')
          const headers = await getAuthHeaders()
          console.log('📋 Auth headers prepared:', headers)
          
          const response = await fetch('/api/workflows/executions', { headers })
          console.log('📡 Response status:', response.status, response.statusText)
          
          if (response.ok) {
            const executions = await response.json()
            console.log('✅ Executions fetched:', executions.length, 'executions')
            console.log('📊 Executions data:', executions)
            set({ executions })
          } else {
            const errorText = await response.text()
            console.error('❌ Failed to fetch executions - Status:', response.status, 'Error:', errorText)
          }
        } catch (error) {
          console.error('❌ Failed to fetch workflow executions:', error)
        }
      },

      createWorkflow: async (workflowData) => {
        const headers = await getAuthHeaders()
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers,
          body: JSON.stringify(workflowData)
        })
        
        if (!response.ok) {
          throw new Error('Failed to create workflow')
        }
        
        const workflow = await response.json()
        set(state => ({ workflows: [...state.workflows, workflow] }))
        return workflow
      },

      updateWorkflow: async (id, updates) => {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/workflows/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updates)
        })
        
        if (!response.ok) {
          throw new Error('Failed to update workflow')
        }
        
        const updatedWorkflow = await response.json()
        set(state => ({
          workflows: state.workflows.map(w => w.id === id ? updatedWorkflow : w)
        }))
      },

      deleteWorkflow: async (id) => {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/workflows/${id}`, {
          method: 'DELETE',
          headers
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete workflow')
        }
        
        set(state => ({
          workflows: state.workflows.filter(w => w.id !== id)
        }))
      },

      executeWorkflow: async (workflowId, inputData, threadId) => {
        const headers = await getAuthHeaders()
        const response = await fetch('/api/workflows/execute', {
          method: 'POST',
          headers,
          body: JSON.stringify({ workflowId, inputData, threadId })
        })
        
        if (!response.ok) {
          throw new Error('Failed to execute workflow')
        }
        
        const execution = await response.json()
        set(state => ({ executions: [...state.executions, execution] }))
        return execution
      },

      executeWorkflowInChat: async (workflowId, inputData, threadId, selectedModel, webSearchEnabled, onRefresh) => {
        try {
          // Get the workflow details
          const workflow = get().workflows.find(w => w.id === workflowId)
          if (!workflow) {
            throw new Error('Workflow not found')
          }

          // Create a special workflow execution message that will be processed by the chat API
          const workflowPrompt = `[EXECUTE_WORKFLOW]
WORKFLOW_ID: ${workflowId}
WORKFLOW_NAME: ${workflow.name}
WORKFLOW_DESCRIPTION: ${workflow.description || 'No description'}
INPUT_DATA: ${JSON.stringify(inputData)}
WEB_SEARCH_ENABLED: ${webSearchEnabled}
SELECTED_MODEL: ${selectedModel}

WORKFLOW_STEPS:
${workflow.steps.map((step, i) => `
STEP_${i + 1}:
- ID: ${step.id}
- NAME: ${step.name}
- DESCRIPTION: ${step.description || ''}
- PROMPT: ${step.prompt}
- WEB_SEARCH: ${step.webSearchEnabled || false}
- VARIABLES: ${JSON.stringify(step.variables || [])}
- OUTPUT_VARIABLE: ${step.outputVariable || ''}
`).join('')}
[/EXECUTE_WORKFLOW]

Execute this workflow step by step. For each step:
1. Show progress indicator (🚀 Starting, ⚡ Processing, ✅ Complete)
2. Use web search when enabled for that step
3. Display results clearly
4. Pass outputs between steps as variables
5. Show final completion status

Begin execution now.`

          // Return the message that should be sent to chat
          return {
            message: workflowPrompt,
            executionData: {
              workflowId,
              workflowName: workflow.name,
              inputData,
              webSearchEnabled,
              selectedModel
            }
          }
        } catch (error) {
          console.error('Failed to prepare workflow execution:', error)
          throw error
        }
      },

      cancelExecution: async (executionId) => {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/workflows/executions/${executionId}/cancel`, {
          method: 'POST',
          headers
        })
        
        if (!response.ok) {
          throw new Error('Failed to cancel execution')
        }
        
        set(state => ({
          executions: state.executions.map(e => 
            e.id === executionId ? { ...e, status: 'cancelled' as const } : e
          )
        }))
      },

      generateWorkflow: async (description, selectedModel) => {
        const headers = await getAuthHeaders()
        const response = await fetch('/api/workflows/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ description, selectedModel })
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to generate workflow')
        }
        
        return await response.json()
      }
    }),
    {
      name: 'workflow-store',
      partialize: (state) => ({
        isWorkflowBuilderOpen: state.isWorkflowBuilderOpen
      })
    }
  )
)
