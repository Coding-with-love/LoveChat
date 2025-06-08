import { supabase } from "./client"
import { v4 as uuidv4 } from "uuid"

// Maximum file size (50MB to accommodate larger files)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// File type categories for better handling
export const FILE_CATEGORIES = {
  IMAGE: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/tiff"],
  VIDEO: ["video/mp4", "video/avi", "video/mov", "video/wmv", "video/flv", "video/webm", "video/mkv"],
  AUDIO: ["audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/flac", "audio/m4a"],
  DOCUMENT: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
  ],
  ARCHIVE: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
  ],
  CODE: [
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/json",
    "application/xml",
    "text/xml",
    "application/x-python",
    "text/x-python",
    "text/x-java-source",
    "text/x-c",
    "text/x-c++",
    "text/x-csharp",
    "text/x-php",
    "text/x-ruby",
    "text/x-go",
    "text/x-rust",
    "text/x-swift",
    "text/x-kotlin",
    "text/x-typescript",
    "application/typescript",
    "text/markdown",
    "text/x-yaml",
    "application/yaml",
  ],
} as const

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
}

export function getFileCategory(mimeType: string): string {
  for (const [category, types] of Object.entries(FILE_CATEGORIES)) {
    if (types.includes(mimeType as any)) {
      return category.toLowerCase()
    }
  }
  return "other"
}

export function isCodeFile(fileName: string, mimeType: string): boolean {
  const codeExtensions = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".h",
    ".hpp",
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".md",
    ".sql",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".bat",
    ".cmd",
    ".vue",
    ".svelte",
    ".dart",
    ".scala",
    ".clj",
    ".hs",
    ".elm",
    ".r",
    ".m",
    ".mm",
    ".pl",
    ".pm",
    ".lua",
    ".vim",
    ".dockerfile",
    ".makefile",
  ]

  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
  return codeExtensions.includes(extension) || FILE_CATEGORIES.CODE.includes(mimeType as any)
}

export function getFileIcon(mimeType: string): string {
  const category = getFileCategory(mimeType)

  switch (category) {
    case "image":
      return "🖼️"
    case "video":
      return "🎥"
    case "audio":
      return "🎵"
    case "document":
      return "📄"
    case "archive":
      return "📦"
    case "code":
      return "💻"
    default:
      return "📎"
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

async function readFileContent(file: File): Promise<{ content: string; lineCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const lineCount = content.split("\n").length
        resolve({ content, lineCount })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

export async function uploadFile(file: File, threadId: string): Promise<FileUploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
  }

  // Check for potentially dangerous file types (optional security measure)
  const dangerousExtensions = [".exe", ".bat", ".cmd", ".scr", ".pif", ".com", ".vbs", ".js", ".jar"]
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))

  if (dangerousExtensions.includes(fileExtension)) {
    throw new Error("This file type is not allowed for security reasons.")
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("Authentication required")
  }

  // Generate a unique file name to avoid collisions
  const fileExtension2 = file.name.split(".").pop()
  const fileName = `${uuidv4()}.${fileExtension2}`
  const filePath = `${user.id}/${threadId}/${fileName}`

  // Upload the file to Supabase Storage
  const { error: uploadError, data: uploadData } = await supabase.storage
    .from("chat-attachments")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    console.error("File upload error:", uploadError)
    throw new Error("Failed to upload file")
  }

  // Get the public URL for the uploaded file
  const { data: publicUrlData } = supabase.storage.from("chat-attachments").getPublicUrl(filePath)

  let thumbnailUrl: string | undefined = undefined
  let lineCount: number | undefined = undefined
  let content: string | undefined = undefined

  // Generate thumbnail for images only
  if (FILE_CATEGORIES.IMAGE.includes(file.type as any)) {
    thumbnailUrl = publicUrlData.publicUrl
  }

  // Read content and count lines for code files
  if (isCodeFile(file.name, file.type)) {
    try {
      const fileData = await readFileContent(file)
      lineCount = fileData.lineCount
      content = fileData.content
    } catch (error) {
      console.warn("Failed to read file content:", error)
      // Don't fail the upload if we can't read the content
    }
  }

  const category = getFileCategory(file.type)

  return {
    id: uuidv4(),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    fileUrl: publicUrlData.publicUrl,
    thumbnailUrl,
    category,
    lineCount,
    content,
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from("chat-attachments").remove([filePath])

  if (error) {
    console.error("File deletion error:", error)
    throw new Error("Failed to delete file")
  }
}

export function getFilePathFromUrl(url: string): string {
  try {
    // Extract the path from the URL
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/")
    // Remove the bucket name and "object" from the path
    const filePath = pathParts.slice(pathParts.indexOf("object") + 1).join("/")
    return filePath
  } catch (error) {
    console.error("Error extracting file path from URL:", error)
    return ""
  }
}

// Helper function to check if a file can be previewed in browser
export function canPreviewFile(mimeType: string): boolean {
  const previewableTypes = [
    ...FILE_CATEGORIES.IMAGE,
    "application/pdf",
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/json",
    "text/xml",
    "application/xml",
    "text/markdown",
  ]

  return previewableTypes.includes(mimeType as any)
}
