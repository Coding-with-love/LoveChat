"use client"

import { useState, useEffect } from "react"
import { useArtifactStore, type Artifact } from "@/frontend/stores/ArtifactStore"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Badge } from "@/frontend/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/frontend/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/frontend/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/frontend/components/ui/popover"
import { Code, FileText, Search, Plus, Copy, Eye, Archive, Clock } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ArtifactPickerProps {
  threadId?: string
  onSelectArtifact: (artifact: Artifact, action: 'reference' | 'insert' | 'view') => void
  trigger?: React.ReactNode
  className?: string
}

export function ArtifactPicker({ threadId, onSelectArtifact, trigger, className }: ArtifactPickerProps) {
  const { artifacts, fetchArtifacts, getArtifactsByThread } = useArtifactStore()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (open) {
      // Fetch all artifacts for cross-chat referencing, not just current thread
      fetchArtifacts()
    }
  }, [open, fetchArtifacts])

  // Get relevant artifacts - prioritize current thread, then all artifacts
  const threadArtifacts = threadId ? getArtifactsByThread(threadId) : []
  const otherArtifacts = artifacts.filter(a => (!threadId || a.thread_id !== threadId) && !a.is_archived)
  
  // Filter by search query
  const filteredThreadArtifacts = threadArtifacts.filter(artifact =>
    artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artifact.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artifact.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artifact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  
  // Enhanced filtering for cross-chat artifacts with better sorting
  const filteredOtherArtifacts = otherArtifacts.filter(artifact =>
    artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artifact.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artifact.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artifact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    // Prioritize pinned artifacts
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    // Then by recency
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }).slice(0, searchQuery ? 20 : 10) // Show more results when searching

  const getArtifactIcon = (contentType: string) => {
    switch (contentType) {
      case "code":
      case "javascript":
      case "typescript":
      case "python":
        return <Code className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const handleArtifactAction = (artifact: Artifact, action: 'reference' | 'insert' | 'view') => {
    onSelectArtifact(artifact, action)
    setOpen(false)
    
    switch (action) {
      case 'reference':
        toast.success(`Referenced artifact: ${artifact.title}`)
        break
      case 'insert':
        toast.success(`Inserted artifact: ${artifact.title}`)
        break
      case 'view':
        toast.success(`Viewing artifact: ${artifact.title}`)
        break
    }
  }

  const ArtifactItem = ({ artifact, showThreadBadge = false }: { artifact: Artifact, showThreadBadge?: boolean }) => (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg group">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {getArtifactIcon(artifact.content_type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{artifact.title}</h4>
            {showThreadBadge && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 border-primary/30 bg-primary/10 text-primary">
                <Archive className="h-2 w-2" />
                Cross-Chat
              </Badge>
            )}
            {artifact.is_pinned && (
              <div className="w-2 h-2 bg-primary rounded-full" />
            )}
          </div>
          {artifact.description && (
            <p className="text-xs text-muted-foreground truncate">{artifact.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {artifact.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(artifact.created_at)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => handleArtifactAction(artifact, 'reference')}
        >
          <Plus className="h-3 w-3 mr-1" />
          Reference
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => handleArtifactAction(artifact, 'insert')}
        >
          <Copy className="h-3 w-3 mr-1" />
          Insert
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => handleArtifactAction(artifact, 'view')}
        >
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            <Archive className="h-4 w-4" />
            Artifacts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Artifact</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Current Thread Artifacts */}
          {filteredThreadArtifacts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Current Thread ({filteredThreadArtifacts.length})
              </h3>
              <div className="space-y-1">
                {filteredThreadArtifacts.map((artifact) => (
                  <ArtifactItem key={artifact.id} artifact={artifact} />
                ))}
              </div>
            </div>
          )}

          {/* Other Artifacts */}
          {filteredOtherArtifacts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Archive className="h-4 w-4" />
                From Other Chats ({filteredOtherArtifacts.length})
              </h3>
              <div className="space-y-1">
                {filteredOtherArtifacts.map((artifact) => (
                  <ArtifactItem key={artifact.id} artifact={artifact} showThreadBadge />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredThreadArtifacts.length === 0 && filteredOtherArtifacts.length === 0 && (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "No artifacts found" : "No artifacts yet"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Try adjusting your search terms" 
                  : "Artifacts will appear here as the AI creates them during conversations"
                }
              </p>
            </div>
          )}
        </div>

        <div className="border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              <strong>Reference:</strong> Add artifact link to message
            </span>
            <span>
              <strong>Insert:</strong> Copy content to input
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
