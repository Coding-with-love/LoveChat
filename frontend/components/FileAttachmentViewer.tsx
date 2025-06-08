"use client"

import { useState } from "react"
import Image from "next/image"
import { Download, X, Maximize2, ExternalLink, Eye } from 'lucide-react'
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogClose } from "./ui/dialog"
import { getFileIcon, formatFileSize, canPreviewFile } from "@/lib/supabase/file-upload"

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
      <div className="flex flex-col items-center p-3 border rounded w-32 h-32 justify-between">
        <div className="flex flex-col items-center flex-1 justify-center">
          <div className="text-2xl mb-1">{icon}</div>
          <p className="text-xs truncate w-full text-center font-medium">
            {attachment.fileName.length > 15 
              ? `${attachment.fileName.substring(0, 12)}...` 
              : attachment.fileName
            }
          </p>
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
        </div>
        
        <div className="flex gap-1 w-full">
          {canPreview ? (
            <a 
              href={attachment.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="h-6 px-2 py-1 text-xs w-full">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </a>
          ) : (
            <a 
              href={attachment.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="h-6 px-2 py-1 text-xs w-full">
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </Button>
            </a>
          )}
          
          <a href={attachment.fileUrl} download={attachment.fileName}>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0">
              <Download className="h-3 w-3" />
            </Button>
          </a>
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
