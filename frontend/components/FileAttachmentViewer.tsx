"use client"

import { useState } from "react"
import Image from "next/image"
import { Download, X, Maximize2, ExternalLink, Eye } from "lucide-react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogClose } from "./ui/dialog"
import { getFileIcon, formatFileSize } from "@/lib/supabase/file-upload"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import FileTypeIcon from "./FileTypeIcon"

// Add the canPreviewFile function locally
const canPreviewFile = (fileType: string): boolean => {
  const previewableTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/json",
    "application/xml",
  ]

  return previewableTypes.includes(fileType.toLowerCase())
}

interface FileAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  thumbnailUrl?: string
  category: string
}

interface FileAttachmentViewerProps {
  attachments: FileAttachment[]
}

export default function FileAttachmentViewer({ attachments }: FileAttachmentViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  if (!attachments || attachments.length === 0) return null

  const renderFileCard = (attachment: FileAttachment) => {
    const icon = getFileIcon(attachment.fileType)
    const isImage = attachment.category === "image"
    const canPreview = canPreviewFile(attachment.fileType)

    if (isImage && attachment.thumbnailUrl) {
      return (
        <div
          className="relative w-32 h-32 border rounded overflow-hidden cursor-pointer group"
          onClick={() => setSelectedImage(attachment.fileUrl)}
        >
          <Image
            src={attachment.thumbnailUrl || attachment.fileUrl}
            alt={attachment.fileName}
            fill
            className="object-cover"
            sizes="128px"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Maximize2 className="h-6 w-6 text-white drop-shadow-md" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
            {attachment.fileName}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center p-3 border rounded-lg w-32 h-32 justify-between shadow-sm hover:shadow-md transition-shadow duration-200 bg-background/50 backdrop-blur-sm">
        <div className="flex flex-col items-center flex-1 justify-center">
          <div className="text-2xl mb-1 p-2 rounded-lg bg-muted/50">
            <FileTypeIcon mimeType={attachment.fileType} className="h-6 w-6" showColor={true} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs truncate w-full text-center font-medium cursor-help">
                  {attachment.fileName.length > 15
                    ? `${attachment.fileName.substring(0, 6)}...${attachment.fileName.substring(attachment.fileName.lastIndexOf("."))}`
                    : attachment.fileName}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs break-all">{attachment.fileName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
        </div>

        <div className="flex gap-1 w-full">
          {canPreview ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 py-1 text-xs w-full hover:bg-primary/10 transition-colors"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="h-6 px-2 py-1 text-xs w-full">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open file in new tab</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={attachment.fileUrl} download={attachment.fileName}>
                  <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                    <Download className="h-3 w-3" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="relative group">
            {renderFileCard(attachment)}
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <div className="relative w-full h-[80vh]">
            {selectedImage && (
              <Image
                src={selectedImage || "/placeholder.svg"}
                alt="Full size image"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            )}
          </div>
          <DialogClose className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  )
}
