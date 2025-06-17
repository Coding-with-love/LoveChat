"use client"

import { useState, useEffect } from "react"
import { useArtifactStore, type Artifact, type ArtifactFilters } from "@/frontend/stores/ArtifactStore"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Badge } from "@/frontend/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/frontend/components/ui/alert-dialog"
import {
  Search,
  Filter,
  Grid,
  List,
  Pin,
  Archive,
  Download,
  MoreHorizontal,
  Code,
  FileText,
  Trash2,
  Plus,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { CreateArtifactDialog } from "./CreateArtifactDialog"
import { ArtifactViewer } from "./ArtifactViewer"
import { useThread } from "@/frontend/hooks/useThread"

interface ArtifactGalleryProps {
  threadId?: string
  className?: string
}

export function ArtifactGallery({ threadId, className }: ArtifactGalleryProps) {
  const {
    artifacts,
    isLoading,
    error,
    fetchArtifacts,
    deleteArtifact,
    pinArtifact,
    archiveArtifact,
    downloadArtifact,
    selectArtifact,
    selectedArtifact,
  } = useArtifactStore()

  const { thread } = useThread(threadId || null)

  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedContentType, setSelectedContentType] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [artifactToDelete, setArtifactToDelete] = useState<Artifact | null>(null)

  // Fetch artifacts on mount and when filters change
  useEffect(() => {
    const filters: ArtifactFilters = {
      threadId,
      search: searchQuery || undefined,
      contentType: selectedContentType === "all" ? undefined : selectedContentType,
      archived: false,
    }
    fetchArtifacts(filters)
  }, [fetchArtifacts, threadId, searchQuery, selectedContentType])

  // Filter artifacts based on current filters
  const filteredArtifacts = artifacts.filter((artifact) => {
    if (threadId && artifact.thread_id !== threadId) return false
    if (artifact.is_archived) return false
    if (selectedContentType !== "all" && artifact.content_type !== selectedContentType) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        artifact.title.toLowerCase().includes(query) ||
        artifact.description?.toLowerCase().includes(query) ||
        artifact.content.toLowerCase().includes(query) ||
        artifact.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }
    return true
  })

  const pinnedArtifacts = filteredArtifacts.filter((a) => a.is_pinned)
  const regularArtifacts = filteredArtifacts.filter((a) => !a.is_pinned)

  // Get unique content types for filter
  const contentTypes = Array.from(new Set(artifacts.map((a) => a.content_type)))

  const handleDeleteArtifact = async () => {
    if (!artifactToDelete) return

    try {
      await deleteArtifact(artifactToDelete.id)
      toast.success("Artifact deleted successfully")
      setDeleteDialogOpen(false)
      setArtifactToDelete(null)
    } catch (error) {
      toast.error("Failed to delete artifact")
    }
  }

  const handleViewArtifact = (artifact: Artifact) => {
    selectArtifact(artifact)
    setShowViewDialog(true)
  }

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
      year: "numeric",
    })
  }

  const ArtifactCard = ({ artifact }: { artifact: Artifact }) => (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-200 cursor-pointer",
        artifact.is_pinned && "ring-2 ring-primary/20",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {getArtifactIcon(artifact.content_type)}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm truncate cursor-default" title={artifact.title}>
                {artifact.title}
              </CardTitle>
            </div>
            {artifact.is_pinned && (
              <Pin className="h-3 w-3 text-primary flex-shrink-0" />
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewArtifact(artifact)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => pinArtifact(artifact.id)}>
                <Pin className="h-4 w-4 mr-2" />
                {artifact.is_pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadArtifact(artifact.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => archiveArtifact(artifact.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setArtifactToDelete(artifact)
                  setDeleteDialogOpen(true)
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {artifact.description && <p className="text-xs text-muted-foreground line-clamp-2">{artifact.description}</p>}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Content Preview */}
          <div className="bg-muted/50 rounded-md p-2 text-xs font-mono line-clamp-3 overflow-hidden">
            {artifact.content.substring(0, 150)}
            {artifact.content.length > 150 && "..."}
          </div>

          {/* Tags */}
          {artifact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {artifact.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {artifact.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  +{artifact.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(artifact.created_at)}</span>
            <span>v{artifact.version}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const ArtifactListItem = ({ artifact }: { artifact: Artifact }) => (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group",
        artifact.is_pinned && "ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {getArtifactIcon(artifact.content_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate flex-1 min-w-0" title={artifact.title}>
              {artifact.title}
            </h3>
            {artifact.is_pinned && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
          </div>
          {artifact.description && (
            <p className="text-xs text-muted-foreground truncate" title={artifact.description}>
              {artifact.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {artifact.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
            {tag}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground">{formatDate(artifact.created_at)}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewArtifact(artifact)}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => pinArtifact(artifact.id)}>
              <Pin className="h-4 w-4 mr-2" />
              {artifact.is_pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadArtifact(artifact.id)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => archiveArtifact(artifact.id)}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setArtifactToDelete(artifact)
                setDeleteDialogOpen(true)
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  if (error) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <p className="text-destructive">Error loading artifacts: {error}</p>
        <Button onClick={() => fetchArtifacts()} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">Artifact Management</h2>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Artifact
          </Button>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-muted/50 p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedContentType("all")}>All Types</DropdownMenuItem>
              {contentTypes.map((type) => (
                <DropdownMenuItem key={type} onClick={() => setSelectedContentType(type)}>
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 hover:scale-110 transition-transform"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 hover:scale-110 transition-transform"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({filteredArtifacts.length})</TabsTrigger>
            <TabsTrigger value="pinned">Pinned ({pinnedArtifacts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredArtifacts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No artifacts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search terms" : "Create your first artifact to get started"}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Artifact
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArtifacts.map((artifact) => (
                  <ArtifactCard key={artifact.id} artifact={artifact} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredArtifacts.map((artifact) => (
                  <ArtifactListItem key={artifact.id} artifact={artifact} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pinned" className="space-y-4">
            {pinnedArtifacts.length === 0 ? (
              <div className="text-center py-8">
                <Pin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No pinned artifacts</h3>
                <p className="text-muted-foreground">Pin important artifacts for quick access</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedArtifacts.map((artifact) => (
                  <ArtifactCard key={artifact.id} artifact={artifact} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {pinnedArtifacts.map((artifact) => (
                  <ArtifactListItem key={artifact.id} artifact={artifact} />
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              💡 Tip: Pinned artifacts are always shown first for easy access.
            </p>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <CreateArtifactDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        threadId={threadId}
        threadTitle={thread?.title}
      />

      {selectedArtifact && (
        <ArtifactViewer open={showViewDialog} onOpenChange={setShowViewDialog} artifact={selectedArtifact} />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Artifact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{artifactToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArtifact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
