"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { Button } from "@/frontend/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Badge } from "@/frontend/components/ui/badge"
import { ArrowLeft, Plus, Edit, Trash2, MessageSquare, Calendar } from "lucide-react"
import { getProjects, getThreadsByProject, deleteProject, createThread } from "@/lib/supabase/queries"
import { CreateProjectDialog } from "@/frontend/components/CreateProjectDialog"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
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
import type { Database } from "@/lib/supabase/types"

type Project = Database["public"]["Tables"]["projects"]["Row"]
type Thread = Database["public"]["Tables"]["threads"]["Row"]

export default function ProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (!projectId) return

    const fetchProjectData = async () => {
      try {
        setLoading(true)
        const [projectsData, threadsData] = await Promise.all([getProjects(), getThreadsByProject(projectId)])

        const currentProject = projectsData.find((p) => p.id === projectId)
        if (!currentProject) {
          toast.error("Project not found")
          navigate("/chat")
          return
        }

        setProject(currentProject)
        setThreads(threadsData)
      } catch (error) {
        console.error("Failed to fetch project data:", error)
        toast.error("Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [projectId, navigate])

  const handleCreateThread = async () => {
    if (!projectId) return

    try {
      const threadId = crypto.randomUUID()
      await createThread(threadId, projectId)
      navigate(`/chat/${threadId}`)
      toast.success("New chat created")
    } catch (error) {
      console.error("Failed to create thread:", error)
      toast.error("Failed to create chat")
    }
  }

  const handleDeleteProject = async () => {
    if (!project) return

    try {
      await deleteProject(project.id)
      toast.success("Project deleted")
      navigate("/chat")
    } catch (error) {
      console.error("Failed to delete project:", error)
      toast.error("Failed to delete project")
    }
  }

  const refreshData = async () => {
    if (!projectId) return

    try {
      const [projectsData, threadsData] = await Promise.all([getProjects(), getThreadsByProject(projectId)])

      const currentProject = projectsData.find((p) => p.id === projectId)
      if (currentProject) {
        setProject(currentProject)
      }
      setThreads(threadsData)
    } catch (error) {
      console.error("Failed to refresh data:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <Link to="/chat" className="text-blue-600 hover:underline">
            Go back to chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/chat")} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{project.name}</h1>
            {project.description && <p className="text-muted-foreground truncate">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Chats</span>
            </div>
            <p className="text-2xl font-bold">{threads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Created</span>
            </div>
            <p className="text-2xl font-bold">
              {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Last Updated</span>
            </div>
            <p className="text-2xl font-bold">
              {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chats Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chats</CardTitle>
              <CardDescription>Manage conversations in this project</CardDescription>
            </div>
            <Button onClick={handleCreateThread}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {threads.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No chats yet</h3>
              <p className="text-muted-foreground mb-4">Create your first chat to get started</p>
              <Button onClick={handleCreateThread}>
                <Plus className="h-4 w-4 mr-2" />
                Create Chat
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/chat/${thread.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{thread.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Last updated {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CreateProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        existingProject={project}
        onSuccess={refreshData}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the project "{project.name}"?
              <br />
              <br />
              This will <strong>not</strong> delete the conversations in this project, but they will be moved to
              "Unorganized".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
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
