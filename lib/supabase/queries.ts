import { supabase } from "./client"
import type { UIMessage } from "ai"
import { v4 as uuidv4 } from "uuid"
import type { FileUploadResult } from "./file-upload"

export const getThreads = async () => {
  const { data, error } = await supabase.from("threads").select("*").order("last_message_at", { ascending: false })

  if (error) throw error
  return data || []
}

export const createThread = async (id: string, projectId?: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase
    .from("threads")
    .insert({
      id,
      title: "New Chat",
      user_id: user.id,
      project_id: projectId || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateThread = async (id: string, title: string) => {
  const { data, error } = await supabase
    .from("threads")
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteThread = async (id: string) => {
  const { error } = await supabase.from("threads").delete().eq("id", id)

  if (error) throw error
}

export const deleteAllThreads = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { error } = await supabase.from("threads").delete().eq("user_id", user.id)

  if (error) throw error
}

export const getMessagesByThreadId = async (threadId: string) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

export const getFileAttachmentsByMessageId = async (messageId: string) => {
  const { data, error } = await supabase
    .from("file_attachments")
    .select("*")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

export const getFileAttachmentsByThreadId = async (threadId: string) => {
  const { data, error } = await supabase
    .from("file_attachments")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

export const createMessage = async (threadId: string, message: UIMessage, fileAttachments?: FileUploadResult[]) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  console.log("🔍 Creating message:", {
    messageId: message.id,
    threadId,
    userId: user.id,
    role: message.role,
    hasAttachments: !!fileAttachments?.length,
  })

  // Update message parts to include file attachments if any
  const updatedParts = [...(message.parts || [])]

  if (fileAttachments && fileAttachments.length > 0) {
    // Add file attachments to message parts
    updatedParts.push({
      type: "file_attachments",
      attachments: fileAttachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        fileUrl: attachment.fileUrl,
        thumbnailUrl: attachment.thumbnailUrl,
      })),
    })
  }

  const { error: messageError } = await supabase.from("messages").insert({
    id: message.id,
    thread_id: threadId,
    user_id: user.id,
    parts: updatedParts,
    role: message.role,
    content: message.content,
    created_at: (message.createdAt || new Date()).toISOString(),
  })

  if (messageError) {
    console.error("❌ Failed to create message:", messageError)
    throw messageError
  }

  console.log("✅ Message created successfully")

  // Insert file attachments if any
  if (fileAttachments && fileAttachments.length > 0) {
    const attachmentsToInsert = fileAttachments.map((attachment) => ({
      id: attachment.id,
      message_id: message.id,
      thread_id: threadId,
      user_id: user.id,
      file_name: attachment.fileName,
      file_type: attachment.fileType,
      file_size: attachment.fileSize,
      file_url: attachment.fileUrl,
      thumbnail_url: attachment.thumbnailUrl,
    }))

    const { error: attachmentsError } = await supabase.from("file_attachments").insert(attachmentsToInsert)

    if (attachmentsError) {
      console.error("❌ Failed to create file attachments:", attachmentsError)
      throw attachmentsError
    }

    console.log("✅ File attachments created successfully")
  }

  const { error: threadError } = await supabase
    .from("threads")
    .update({
      last_message_at: (message.createdAt || new Date()).toISOString(),
    })
    .eq("id", threadId)

  if (threadError) {
    console.error("❌ Failed to update thread:", threadError)
    throw threadError
  }

  console.log("✅ Thread updated successfully")
}

export const deleteTrailingMessages = async (threadId: string, createdAt: Date, gte = true) => {
  const operator = gte ? "gte" : "gt"
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("thread_id", threadId)
    [operator]("created_at", createdAt.toISOString())

  if (error) throw error
}

export const createMessageSummary = async (threadId: string, messageId: string, content: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase
    .from("message_summaries")
    .insert({
      id: uuidv4(),
      thread_id: threadId,
      message_id: messageId,
      user_id: user.id,
      content,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const getMessageSummaries = async (threadId: string) => {
  const { data, error } = await supabase
    .from("message_summaries")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

// Chat Sharing Functions
export const createSharedThread = async (
  threadId: string,
  title: string,
  description?: string,
  isPublic = true,
  password?: string,
  expiresAt?: Date,
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  // Generate a unique share token
  const shareToken = generateShareToken()

  // Hash password if provided
  let passwordHash: string | undefined
  if (password) {
    passwordHash = await hashPassword(password)
  }

  const { data, error } = await supabase
    .from("shared_threads")
    .insert({
      thread_id: threadId,
      user_id: user.id,
      share_token: shareToken,
      title,
      description,
      is_public: isPublic,
      password_hash: passwordHash,
      expires_at: expiresAt?.toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Updated functions to use API routes for public access
export const getSharedThread = async (shareToken: string, password?: string) => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (password) {
      // Use POST request with password
      const response = await fetch(`/api/shared/${shareToken}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to access shared conversation")
      }

      return await response.json()
    } else {
      // Use GET request without password
      const response = await fetch(`/api/shared/${shareToken}`, {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to access shared conversation")
      }

      return await response.json()
    }
  } catch (error) {
    console.error("Failed to get shared thread:", error)
    throw error
  }
}

export const getSharedThreadMessages = async (shareToken: string) => {
  try {
    const response = await fetch(`/api/shared/${shareToken}/messages`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to load messages")
    }

    return await response.json()
  } catch (error) {
    console.error("Failed to get shared thread messages:", error)
    throw error
  }
}

export const getUserSharedThreads = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase
    .from("shared_threads")
    .select("*, threads(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export const updateSharedThread = async (
  id: string,
  updates: {
    title?: string
    description?: string
    is_public?: boolean
    password?: string
    expires_at?: Date | null
  },
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  // Handle password update
  if (updates.password !== undefined) {
    if (updates.password) {
      updateData.password_hash = await hashPassword(updates.password)
    } else {
      updateData.password_hash = null
    }
    delete updateData.password
  }

  // Handle expires_at
  if (updates.expires_at !== undefined) {
    updateData.expires_at = updates.expires_at?.toISOString() || null
  }

  const { data, error } = await supabase
    .from("shared_threads")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteSharedThread = async (id: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { error } = await supabase.from("shared_threads").delete().eq("id", id).eq("user_id", user.id)

  if (error) throw error
}

// Project Functions
export const getProjects = async () => {
  const { data, error } = await supabase
    .from("projects")
    .select("*, threads(count)")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export const createProject = async (name: string, description?: string, color?: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      description,
      color: color || "#6366f1",
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateProject = async (id: string, updates: { name?: string; description?: string; color?: string }) => {
  const { data, error } = await supabase
    .from("projects")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteProject = async (id: string) => {
  const { error } = await supabase.from("projects").delete().eq("id", id)

  if (error) throw error
}

export const getThreadsByProject = async (projectId: string) => {
  const { data, error } = await supabase
    .from("threads")
    .select("*")
    .eq("project_id", projectId)
    .order("last_message_at", { ascending: false })

  if (error) throw error
  return data || []
}

export const moveThreadToProject = async (threadId: string, projectId: string | null) => {
  const { data, error } = await supabase
    .from("threads")
    .update({
      project_id: projectId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Code Conversion Functions
export const saveCodeConversion = async (
  threadId: string,
  messageId: string,
  originalCode: string,
  originalLanguage: string,
  convertedCode: string,
  targetLanguage: string,
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  console.log("💾 Saving code conversion:", {
    threadId,
    messageId,
    originalLanguage,
    targetLanguage,
  })

  // Generate a UUID for the conversion ID
  const conversionId = uuidv4()

  const { data, error } = await supabase
    .from("code_conversions")
    .insert({
      id: conversionId,
      thread_id: threadId,
      message_id: messageId, // Now accepts string IDs
      user_id: user.id,
      original_code: originalCode,
      original_language: originalLanguage,
      converted_code: convertedCode,
      target_language: targetLanguage,
    })
    .select()
    .single()

  if (error) {
    console.error("❌ Failed to save code conversion:", error)
    throw error
  }

  console.log("✅ Code conversion saved successfully")
  return data
}

export const getCodeConversions = async (threadId: string, messageId: string) => {
  try {
    console.log("🔍 Getting code conversions for:", { threadId, messageId })

    const { data, error } = await supabase
      .from("code_conversions")
      .select("*")
      .eq("thread_id", threadId)
      .eq("message_id", messageId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ Failed to get code conversions:", error)
      throw error
    }

    console.log(`✅ Found ${data?.length || 0} code conversions`)
    return data || []
  } catch (error) {
    console.error("❌ Failed to get code conversions:", error)
    throw error
  }
}

// Helper functions
function generateShareToken(): string {
  // Generate a URL-safe random token
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password)
  return hashedPassword === hash
}
