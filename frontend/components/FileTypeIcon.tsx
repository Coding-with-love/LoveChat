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
import { cn } from "@/lib/utils"

interface FileTypeIconProps {
  mimeType: string
  className?: string
  showColor?: boolean
}

export default function FileTypeIcon({ mimeType, className = "h-4 w-4", showColor = true }: FileTypeIconProps) {
  const getIconForMimeType = (type: string) => {
    // Images
    if (type.startsWith("image/")) {
      return <ImageIcon className={cn(className, showColor && "text-blue-500")} />
    }

    // Videos
    if (type.startsWith("video/")) {
      return <Video className={cn(className, showColor && "text-purple-500")} />
    }

    // Audio
    if (type.startsWith("audio/")) {
      return <Music className={cn(className, showColor && "text-green-500")} />
    }

    // Documents
    if (type === "application/pdf") {
      return <FileText className={cn(className, showColor && "text-red-500")} />
    }

    // Microsoft Office
    if (type.includes("word") || type.includes("document")) {
      return <FileText className={cn(className, showColor && "text-blue-600")} />
    }

    if (type.includes("excel") || type.includes("spreadsheet")) {
      return <FileSpreadsheet className={cn(className, showColor && "text-green-600")} />
    }

    if (type.includes("powerpoint") || type.includes("presentation")) {
      return <Presentation className={cn(className, showColor && "text-orange-500")} />
    }

    // Archives
    if (
      type.includes("zip") ||
      type.includes("rar") ||
      type.includes("7z") ||
      type.includes("tar") ||
      type.includes("gzip")
    ) {
      return <Archive className={cn(className, showColor && "text-amber-500")} />
    }

    // Code files
    if (type.startsWith("text/") || type.includes("javascript") || type.includes("json") || type.includes("xml")) {
      return <Code className={cn(className, showColor && "text-indigo-500")} />
    }

    // Database files
    if (type.includes("sql") || type.includes("database")) {
      return <Database className={cn(className, showColor && "text-teal-500")} />
    }

    // Default
    return <File className={cn(className, showColor && "text-gray-500")} />
  }

  return getIconForMimeType(mimeType)
}
