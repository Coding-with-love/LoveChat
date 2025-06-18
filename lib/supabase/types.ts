export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface FileUploadResult {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  thumbnailUrl?: string
  category: string
  lineCount?: number
  content?: string
  extractedText?: string
}

// Add Message type export
export interface Message {
  id: string
  thread_id: string
  user_id: string
  content: string
  role: "user" | "assistant" | "system"
  parts: any[] | null // parts can include workflow_result type for workflow execution results
  reasoning: string | null
  created_at: string
  updated_at: string
  // New fields for message attempts
  parent_message_id?: string | null
  attempt_number?: number
  is_active_attempt?: boolean
}

// Add PinnedMessage interface
export interface PinnedMessage {
  id: string
  user_id: string
  thread_id: string
  message_id: string
  note: string | null
  created_at: string
  updated_at: string
}

// Add ConversationSummary interface
export interface ConversationSummary {
  id: string
  thread_id: string
  user_id: string
  summary: string
  action_items: string[]
  key_points: string[]
  topics: string[]
  message_count: number
  created_at: string
  updated_at: string
}

// Add Persona interface
export interface Persona {
  id: string
  user_id: string
  name: string
  description?: string
  system_prompt: string
  avatar_emoji: string
  color: string
  is_default: boolean
  is_public: boolean
  created_at: string
  updated_at: string
}

// Add PromptTemplate interface
export interface PromptTemplate {
  id: string
  user_id: string
  persona_id?: string
  title: string
  description?: string
  template: string
  variables: Array<{
    name: string
    type: "text" | "textarea" | "number" | "select"
    placeholder?: string
    options?: string[]
    required?: boolean
  }>
  category?: string
}

export interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string
          user_id: string
          provider: string
          api_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          api_key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          api_key?: string
          created_at?: string
          updated_at?: string
        }
      }
      conversation_summaries: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          summary: string
          action_items: string[]
          key_points: string[]
          topics: string[]
          message_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          summary: string
          action_items?: string[]
          key_points?: string[]
          topics?: string[]
          message_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          summary?: string
          action_items?: string[]
          key_points?: string[]
          topics?: string[]
          message_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          content: string
          role: "user" | "assistant" | "system"
          parts: any[] | null
          reasoning: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          content: string
          role: "user" | "assistant" | "system"
          parts?: any[] | null
          reasoning?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          content?: string
          role?: "user" | "assistant" | "system"
          parts?: any[] | null
          reasoning?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      threads: {
        Row: {
          id: string
          user_id: string
          title: string
          project_id: string | null
          created_at: string
          updated_at: string
          last_message_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      message_summaries: {
        Row: {
          id: string
          thread_id: string
          message_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          message_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          message_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      file_attachments: {
        Row: {
          id: string
          message_id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          file_url?: string
          created_at?: string
        }
      }
      shared_conversations: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          share_token: string
          is_public: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          share_token: string
          is_public?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          share_token?: string
          is_public?: boolean
          expires_at?: string | null
          created_at?: string
        }
      }
      resumable_streams: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          message_id: string
          status: "active" | "completed" | "failed"
          partial_content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          message_id: string
          status?: "active" | "completed" | "failed"
          partial_content?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          message_id?: string
          status?: "active" | "completed" | "failed"
          partial_content?: string
          created_at?: string
          updated_at?: string
        }
      }
      code_conversions: {
        Row: {
          id: string
          thread_id: string
          message_id: string
          user_id: string
          original_code: string
          converted_code: string
          original_language: string
          target_language: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          message_id: string
          user_id: string
          original_code: string
          converted_code: string
          original_language: string
          target_language: string
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          message_id?: string
          original_code?: string
          converted_code?: string
          original_language?: string
          target_language?: string
          created_at?: string
        }
      }
      pinned_messages: {
        Row: {
          id: string
          user_id: string
          thread_id: string
          message_id: string
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          thread_id: string
          message_id: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          thread_id?: string
          message_id?: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflows: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          steps: any[]
          is_public: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          steps: any[]
          is_public?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          steps?: any[]
          is_public?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_id: string
          user_id: string
          thread_id: string | null
          status: "pending" | "running" | "completed" | "failed" | "cancelled"
          input_data: any | null
          output_data: any | null
          step_results: any[]
          current_step: number
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          user_id: string
          thread_id?: string | null
          status?: "pending" | "running" | "completed" | "failed" | "cancelled"
          input_data?: any | null
          output_data?: any | null
          step_results?: any[]
          current_step?: number
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          user_id?: string
          thread_id?: string | null
          status?: "pending" | "running" | "completed" | "failed" | "cancelled"
          input_data?: any | null
          output_data?: any | null
          step_results?: any[]
          current_step?: number
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      workflow_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string | null
          steps: any[]
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string | null
          steps: any[]
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string | null
          steps?: any[]
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
