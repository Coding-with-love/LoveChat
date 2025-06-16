export interface WorkflowStep {
    id: string
    name: string
    prompt: string
    description?: string
    variables?: string[] // Variables this step expects
    outputVariable?: string // Variable name for this step's output
    webSearchEnabled?: boolean // Whether this step should use web search
  }
  
  export interface Workflow {
    id: string
    user_id: string
    name: string
    description?: string
    steps: WorkflowStep[]
    is_public: boolean
    tags: string[]
    created_at: string
    updated_at: string
  }
  
  export interface WorkflowTemplate {
    id: string
    name: string
    description?: string
    category?: string
    steps: WorkflowStep[]
    tags: string[]
    is_featured: boolean
    created_at: string
  }
  
  export interface WorkflowExecution {
    id: string
    workflow_id: string
    user_id: string
    thread_id?: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    input_data?: Record<string, any>
    output_data?: Record<string, any>
    step_results: Array<{
      step_id: string
      status: 'pending' | 'running' | 'completed' | 'failed'
      input: Record<string, any>
      output?: string
      error?: string
      started_at?: string
      completed_at?: string
    }>
    current_step: number
    error_message?: string
    started_at?: string
    completed_at?: string
    created_at: string
  }
  
  export interface WorkflowVariable {
    name: string
    description: string
    required: boolean
    type: 'text' | 'number' | 'boolean'
    defaultValue?: any
  }
  