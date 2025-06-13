import type { SupabaseClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"

// Update the FileUploadResult interface to clarify the URL property names
export interface FileUploadResult {
  id?: string
  fileName: string
  fileType: string
  fileSize: number
  size?: number // For backward compatibility
  content?: string
  extractedText?: string
  category?: string
  lineCount?: number
  fileUrl?: string
  url?: string // For backward compatibility
  thumbnailUrl?: string
}

export async function uploadFile(
  supabaseClient: SupabaseClient,
  file: File,
  threadId: string,
): Promise<FileUploadResult> {
  console.log("🔄 Starting file upload process:", {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    threadId,
  })

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()
  if (authError || !user) {
    console.error("❌ User not authenticated:", authError)
    throw new Error("User must be authenticated to upload files")
  }

  console.log("✅ User authenticated:", user.id)

  // Sanitize filename to remove invalid characters for storage
  const sanitizedFileName = sanitizeFileName(file.name)
  
  // Use user ID in the file path for better organization and permissions
  const fileName = `${user.id}/${threadId}/${Date.now()}-${sanitizedFileName}`
  console.log("📁 Uploading to path:", fileName)

  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from("thread-files")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    console.error("❌ Error uploading file:", uploadError)
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  console.log("✅ File uploaded successfully:", uploadData)

  // Get the public URL for the uploaded file
  const { data: urlData } = supabaseClient.storage.from("thread-files").getPublicUrl(fileName)
  console.log("🔗 Generated file URL:", urlData.publicUrl)

  let extractedText: string | null = null
  let content: string | null = null

  // Handle different file types for text extraction
  if (file.type === "application/pdf") {
    console.log("📄 Processing PDF file for rendering:", file.name)

    try {
      // Try Google Docs specific parser first
      const formData = new FormData()
      formData.append("file", file)

      console.log("🔄 Trying Google Docs PDF parser...")
      const googleDocsResponse = await fetch("/api/parse-google-docs-pdf", {
        method: "POST",
        body: formData,
      })

      if (googleDocsResponse.ok) {
        const googleDocsResult = await googleDocsResponse.json()

        if (googleDocsResult.success && googleDocsResult.text && googleDocsResult.text.trim().length > 10) {
          console.log("✅ Google Docs parser successful:", {
            textLength: googleDocsResult.text.length,
            method: googleDocsResult.method,
          })

          extractedText = googleDocsResult.text
          content = `📄 **PDF Content: ${file.name}** (extracted with ${googleDocsResult.method})

${googleDocsResult.text}`
        } else {
          console.log("⚠️ Google Docs parser failed, trying general renderer...")

          // Fall back to general PDF renderer
          const renderResponse = await fetch("/api/render-pdf", {
            method: "POST",
            body: formData,
          })

          if (renderResponse.ok) {
            const renderResult = await renderResponse.json()

            if (renderResult.success && renderResult.text && renderResult.text.trim().length > 10) {
              console.log("✅ General PDF renderer successful:", {
                textLength: renderResult.text.length,
                method: renderResult.method,
                pages: renderResult.pages,
              })

              extractedText = renderResult.text
              content = `📄 **PDF Content: ${file.name}** (${renderResult.pages} pages, rendered with ${renderResult.method})

${renderResult.text}`
            }
          }
        }
      }

      // If all parsing methods failed, provide a fallback message
      if (!extractedText) {
        console.warn("⚠️ All PDF extraction methods failed")
        content = `📄 **PDF Document: ${file.name}**

I received your PDF file (${formatFileSize(file.size)}), but I'm unable to automatically extract the text content.

**To discuss this document:**
- Open the PDF and copy/paste specific sections you'd like to discuss
- Describe what you see in the document
- Ask specific questions about the content

The file has been uploaded successfully and is available at: ${urlData.publicUrl}`
      }
    } catch (error) {
      console.error("❌ Error during PDF processing:", error)
      content = `📄 **PDF Document: ${file.name}**

**File Details:**
- Size: ${formatFileSize(file.size)}
- Type: PDF Document
- Status: Successfully uploaded and stored
- Error: ${error instanceof Error ? error.message : "Unknown error"}

**To discuss this PDF content with me:**

1. **Copy and paste text**: Open the PDF and copy the sections you want to discuss
2. **Describe the content**: Tell me what type of document this is (syllabus, report, etc.) and what you'd like to know
3. **Ask specific questions**: I can help analyze any text you share from the document

The PDF file has been saved and is available at: ${urlData.publicUrl}`
    }
  } else if (file.type.startsWith("image/")) {
    console.log("🖼️ Processing image file:", file.name)

    try {
      // Use the image analysis API to get a description
      const formData = new FormData()
      formData.append("file", file)

      // Get the auth token from the current session
      const { data: { session } } = await supabaseClient.auth.getSession()
      const authToken = session?.access_token

      console.log("🔄 Analyzing image with vision AI...")
      const analysisResponse = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`
        } : {}
      })

      if (analysisResponse.ok) {
        const analysisResult = await analysisResponse.json()
        
        console.log("📊 Image analysis response:", {
          success: analysisResult.success,
          method: analysisResult.method,
          hasDescription: !!analysisResult.description,
          descriptionPreview: analysisResult.description?.substring(0, 100) + "...",
          hasError: !!analysisResult.error
        })

        if (analysisResult.success && analysisResult.description) {
          // Check if this is a real vision analysis or a fallback
          if (analysisResult.method === "fallback" || analysisResult.method === "error-fallback") {
            console.log("⚠️ Image analysis returned fallback response:", analysisResult.error)
            content = `🖼️ **Image: ${file.name}** (${formatFileSize(file.size)})

Image analysis is not working: ${analysisResult.error || "Unknown error"}

**To discuss this image:**
- Describe what you see in the image
- Ask specific questions about the image content
- The AI can help analyze any descriptions you provide

The image is available for viewing at: ${urlData.publicUrl}`
          } else {
            console.log("✅ Image analysis successful:", {
              descriptionLength: analysisResult.description.length,
              method: analysisResult.method,
            })

            extractedText = analysisResult.description
            content = `🖼️ **Image: ${file.name}** (analyzed with ${analysisResult.method})

${analysisResult.description}`
          }
        } else {
          console.log("⚠️ Image analysis failed, using fallback...")
          content = `🖼️ **Image: ${file.name}** (${formatFileSize(file.size)})

This is an image file that has been uploaded successfully. The AI vision analysis is currently unavailable.

**To discuss this image:**
- Describe what you see in the image
- Ask specific questions about the image content
- The AI can help analyze any descriptions you provide

The image is available for viewing at: ${urlData.publicUrl}`
        }
      } else {
        console.log("⚠️ Image analysis API failed, using fallback...")
        content = `🖼️ **Image: ${file.name}** (${formatFileSize(file.size)})

This is an image file that has been uploaded successfully. 

**To discuss this image:**
- Describe what you see in the image  
- Ask specific questions about the image content
- The AI can help analyze any descriptions you provide

The image is available for viewing at: ${urlData.publicUrl}`
      }
    } catch (error) {
      console.error("❌ Error during image analysis:", error)
      content = `🖼️ **Image: ${file.name}** (${formatFileSize(file.size)})

**File Details:**
- Type: ${file.type}
- Size: ${formatFileSize(file.size)}
- Status: Successfully uploaded
- Analysis Error: ${error instanceof Error ? error.message : "Unknown error"}

**To discuss this image:**
- Describe what you see in the image
- Ask specific questions about the image content  
- The AI can help analyze any descriptions you provide

The image is available for viewing at: ${urlData.publicUrl}`
    }
  } else if (isTextBasedFile(file.name, file.type)) {
    try {
      console.log("📝 Attempting text extraction for text-based file:", file.name)
      const rawContent = await file.text()

      // Clean the content to remove null bytes and other problematic characters
      content = cleanTextContent(rawContent)

      console.log("✅ Text extracted and cleaned successfully:", {
        originalLength: rawContent.length,
        cleanedLength: content.length,
        contentPreview: content.substring(0, 500) + "...",
      })
    } catch (error) {
      console.error("❌ Failed to extract text from file:", error)
      content = null
    }
  } else {
    console.log("📄 Skipping content extraction for binary file:", file.name, file.type)
    // For other binary files like videos, audio, etc., we don't extract content
    content = `[${getFileCategory(file.name, file.type)} file uploaded - ${file.name}]`
  }

  if (content) {
    try {
      extractedText = content
    } catch (extractionError: any) {
      console.error("❌ Error during text processing:", extractionError)
    }
  }

  const category = getFileCategory(file.name, file.type)
  const lineCount = content && isCodeFile(file.name, file.type) ? countLines(content) : undefined

  // In the uploadFile function, update the result object to use consistent property names
  const result: FileUploadResult = {
    id: uuidv4(), // Use proper UUID
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    size: file.size, // For backward compatibility
    content: content || undefined,
    extractedText: extractedText || undefined,
    category,
    lineCount,
    fileUrl: urlData.publicUrl,
    url: urlData.publicUrl, // For backward compatibility
    thumbnailUrl: undefined, // Could be implemented for images
  }

  console.log("📤 Returning file upload result:", {
    fileName: result.fileName,
    category: result.category,
    hasContent: !!result.content,
    contentLength: result.content?.length || 0,
    hasExtractedText: !!result.extractedText,
    extractedTextLength: result.extractedText?.length || 0,
    lineCount: result.lineCount,
    fileUrl: result.fileUrl,
  })

  return result
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️"
  if (mimeType.startsWith("video/")) return "🎥"
  if (mimeType.startsWith("audio/")) return "🎵"
  if (mimeType === "application/pdf") return "📄"
  if (mimeType.startsWith("text/") || mimeType.includes("javascript") || mimeType.includes("json")) return "💻"
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "📦"
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝"
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊"
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📈"
  return "📎"
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
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".scala",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".bat",
    ".cmd",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".xml",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".sql",
    ".md",
    ".txt",
    ".log",
    ".dockerfile",
    ".gitignore",
    ".env",
    ".vue",
    ".svelte",
    ".dart",
    ".r",
    ".m",
    ".mm",
    ".pl",
    ".lua",
    ".vim",
    ".emacs",
    ".clj",
    ".cljs",
    ".ex",
    ".exs",
    ".elm",
    ".hs",
    ".ml",
    ".fs",
    ".fsx",
    ".jl",
    ".nim",
    ".cr",
    ".zig",
    ".odin",
  ]

  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
  const isCodeExtension = codeExtensions.includes(extension)
  const isCodeMimeType =
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("json") ||
    mimeType.startsWith("text/") ||
    mimeType.includes("xml") ||
    mimeType.includes("html")

  return isCodeExtension || isCodeMimeType
}

export function getFileCategory(fileName: string, mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType === "application/pdf") return "document"
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "archive"
  if (isCodeFile(fileName, mimeType)) return "code"
  if (mimeType.includes("word") || mimeType.includes("document") || mimeType.includes("text")) return "document"
  return "file"
}

export function countLines(content: string): number {
  return content.split("\n").length
}

export function isTextBasedFile(fileName: string, mimeType: string): boolean {
  // Define file types that are safe for text extraction
  const textMimeTypes = [
    "text/",
    "application/json",
    "application/javascript",
    "application/typescript",
    "application/xml",
    "application/xhtml+xml",
    "application/x-sh",
    "application/x-csh",
  ]

  const textExtensions = [
    ".txt",
    ".md",
    ".json",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".xml",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".bat",
    ".cmd",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".h",
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".scala",
    ".sql",
    ".log",
    ".dockerfile",
    ".gitignore",
    ".env",
    ".vue",
    ".svelte",
    ".dart",
    ".r",
    ".m",
    ".mm",
    ".pl",
    ".lua",
    ".vim",
    ".emacs",
    ".clj",
    ".cljs",
    ".ex",
    ".exs",
    ".elm",
    ".hs",
    ".ml",
    ".fs",
    ".fsx",
    ".jl",
    ".nim",
    ".cr",
    ".zig",
    ".odin",
  ]

  // Check MIME type
  const isTextMime = textMimeTypes.some((type) => mimeType.startsWith(type))

  // Check file extension
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
  const isTextExtension = textExtensions.includes(extension)

  // Exclude known binary types (except PDF which we now handle specially)
  const binaryMimeTypes = [
    "application/zip",
    "application/x-rar",
    "application/x-tar",
    "application/gzip",
    "image/",
    "video/",
    "audio/",
    "application/octet-stream",
  ]

  const isBinaryMime = binaryMimeTypes.some((type) => mimeType.startsWith(type))

  return (isTextMime || isTextExtension) && !isBinaryMime
}

export function cleanTextContent(content: string): string {
  if (!content) return ""

  // Remove null bytes and other problematic characters
  return content
    .replace(/\u0000/g, "") // Remove null bytes
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Remove other control characters except \t, \n, \r
    .replace(/\uFFFD/g, "") // Remove replacement characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
}

export function sanitizeFileName(fileName: string): string {
  if (!fileName) return "file"

  // Get file extension
  const lastDotIndex = fileName.lastIndexOf(".")
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : ""

  // Sanitize the name part
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace invalid chars with underscore
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .substring(0, 100) // Limit length

  // Ensure we have a valid name
  const finalName = sanitizedName || "file"
  
  return finalName + extension
}
