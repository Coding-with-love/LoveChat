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
  parts: any[] | null
  reasoning: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          content: string
          role: "user" | "assistant" | "system"
          parts: any[] | null
          reasoning: string | null // Add this field for thinking content
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
          reasoning?: string | null // Add this field
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
          reasoning?: string | null // Add this field
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
          share_token?: string | null
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
          source_language: string
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
          source_language: string
          target_language: string
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          message_id?: string
          user_id?: string
          original_code?: string
          converted_code?: string
          source_language?: string
          target_language?: string
          created_at?: string
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
