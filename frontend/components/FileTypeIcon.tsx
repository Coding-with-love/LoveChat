"use client"

import {
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  FileSpreadsheet,
  File,
  Presentation,
  Database,
} from "lucide-react"

interface FileTypeIconProps {
  mimeType: string
  className?: string
}

export default function FileTypeIcon({ mimeType, className = "h-4 w-4" }: FileTypeIconProps) {
  const getIconForMimeType = (type: string) => {
    // Images
    if (type.startsWith("image/")) {
      return <ImageIcon className={className} />
    }

    // Videos
    if (type.startsWith("video/")) {
      return <Video className={className} />
    }

    // Audio
    if (type.startsWith("audio/")) {
      return <Music className={className} />
    }

    // Documents
    if (type === "application/pdf") {
      return <FileText className={className} />
    }

    // Microsoft Office
    if (type.includes("word") || type.includes("document")) {
      return <FileText className={className} />
    }

    if (type.includes("excel") || type.includes("spreadsheet")) {
      return <FileSpreadsheet className={className} />
    }

    if (type.includes("powerpoint") || type.includes("presentation")) {
      return <Presentation className={className} />
    }

    // Archives
    if (
      type.includes("zip") ||
      type.includes("rar") ||
      type.includes("7z") ||
      type.includes("tar") ||
      type.includes("gzip")
    ) {
      return <Archive className={className} />
    }

    // Code files
    if (type.startsWith("text/") || type.includes("javascript") || type.includes("json") || type.includes("xml")) {
      return <Code className={className} />
    }

    // Database files
    if (type.includes("sql") || type.includes("database")) {
      return <Database className={className} />
    }

    // Default
    return <File className={className} />
  }

  return getIconForMimeType(mimeType)
}
