"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "./ui/button"
import { Paperclip, X, Loader2 } from "lucide-react"
import { uploadFile, type FileUploadResult, getFileIcon, formatFileSize, isCodeFile } from "@/lib/supabase/file-upload"
import { toast } from "sonner"
import AnimatedHeight from "./ui/AnimatedHeight"
import { supabase } from "@/lib/supabase/client"

interface FileUploadProps {
  threadId: string
  onFileUpload: (files: FileUploadResult[]) => void
  disabled?: boolean
  uploadedFiles: FileUploadResult[]
  onRemoveFile: (index: number) => void
  onUploadingChange?: (uploading: boolean) => void
}

export default function FileUpload({
  threadId,
  onFileUpload,
  disabled = false,
  uploadedFiles,
  onRemoveFile,
  onUploadingChange,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    setUploading(true)
    onUploadingChange?.(true)

    try {
      const uploadPromises = files.map((file) => uploadFile(supabase, file, threadId))
      const results = await Promise.all(uploadPromises)

      onFileUpload([...uploadedFiles, ...results])
      toast.success(`${results.length} file${results.length > 1 ? "s" : ""} uploaded successfully`)
    } catch (error) {
      console.error("File upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload file")
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        disabled={disabled || uploading}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleButtonClick}
        disabled={disabled || uploading}
        className="h-9 w-9 transition-all duration-200 rounded-lg hover:bg-muted border border-border/50"
        aria-label="Attach file"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      </Button>
    </>
  )
}

// Separate component for file previews that will be rendered above the input
export function FilePreviewList({
  files,
  onRemoveFile,
}: {
  files: FileUploadResult[]
  onRemoveFile: (index: number) => void
}) {
  if (files.length === 0) return null

  const renderFilePreview = (file: FileUploadResult, index: number) => {
    const icon = getFileIcon(file.fileType)
    const isCode = isCodeFile(file.fileName, file.fileType)

    return (
      <div
        key={file.id}
        className="relative group flex items-center gap-2.5 bg-secondary border border-border rounded-lg p-2.5 pr-8 min-w-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* File icon */}
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
          <div className="text-white text-sm">
            {file.category === "image"
              ? "🖼️"
              : file.category === "document"
                ? "📄"
                : file.category === "code"
                  ? "💻"
                  : file.category === "video"
                    ? "🎥"
                    : file.category === "audio"
                      ? "🎵"
                      : file.category === "archive"
                        ? "📦"
                        : "📎"}
          </div>
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{file.fileName}</div>
          <div className="text-xs text-muted-foreground">
            {isCode && file.lineCount ? (
              <span>
                {file.lineCount} lines • {formatFileSize(file.fileSize)}
              </span>
            ) : (
              <span>{formatFileSize(file.fileSize)}</span>
            )}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemoveFile(index)}
          className="absolute top-1.5 right-1.5 w-5 h-5 bg-background border border-border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted-foreground/10"
          aria-label="Remove file"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    )
  }

  return (
    <AnimatedHeight duration={300}>
      <div className="px-4 py-3">
        <div className="flex flex-col gap-2">{files.map((file, index) => renderFilePreview(file, index))}</div>
      </div>
    </AnimatedHeight>
  )
}
