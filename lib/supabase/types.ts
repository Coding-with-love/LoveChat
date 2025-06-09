export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      threads: {
        Row: {
          id: string
          title: string
          user_id: string
          project_id: string | null
          created_at: string
          updated_at: string
          last_message_at: string
        }
        Insert: {
          id: string
          title: string
          user_id: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Update: {
          id?: string
          title?: string
          user_id?: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          parts: any
          content: string
          role: "user" | "assistant" | "system" | "data"
          created_at: string
        }
        Insert: {
          id: string
          thread_id: string
          user_id: string
          parts: any
          content: string
          role: "user" | "assistant" | "system" | "data"
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          parts?: any
          content?: string
          role?: "user" | "assistant" | "system" | "data"
          created_at?: string
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
          id: string
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
          thread_id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          thumbnail_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          thread_id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          thumbnail_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          thread_id?: string
          user_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          file_url?: string
          thumbnail_url?: string | null
          created_at?: string
        }
      }
      shared_threads: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          share_token: string
          title: string
          description: string | null
          is_public: boolean
          password_hash: string | null
          expires_at: string | null
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          share_token: string
          title: string
          description?: string | null
          is_public?: boolean
          password_hash?: string | null
          expires_at?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          share_token?: string
          title?: string
          description?: string | null
          is_public?: boolean
          password_hash?: string | null
          expires_at?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      resumable_streams: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          status: "active" | "paused" | "completed" | "failed"
          partial_content: string
          last_chunk_at: string
          created_at: string
          completed_at: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          status: "active" | "paused" | "completed" | "failed"
          partial_content?: string
          last_chunk_at?: string
          created_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          status?: "active" | "paused" | "completed" | "failed"
          partial_content?: string
          last_chunk_at?: string
          created_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
      }
    }
  }
}
