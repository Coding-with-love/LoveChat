"use client"

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
  SidebarSeparator,
} from "@/frontend/components/ui/sidebar"
import { Button, buttonVariants } from "./ui/button"
import { deleteThread, getThreads, getProjects, moveThreadToProject, deleteProject } from "@/lib/supabase/queries"
import { supabase } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  User,
  LogOut,
  Share2,
  Clock,
  FolderOpen,
  Folder,
  Plus,
  MoreHorizontal,
  Edit,
  Loader2,
  Trash,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { memo } from "react"
import { useAuth } from "@/frontend/components/AuthProvider"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/frontend/components/ui/dropdown-menu"
import ShareDialog from "./ShareDialog"
import { ResumableStreams } from "./ResumableStreams"
import { useResumableStreams } from "../hooks/useResumableStreams"
import { CreateProjectDialog } from "./CreateProjectDialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/frontend/components/ui/collapsible"
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

interface Thread {
  id: string
  title: string
  user_id: string
  project_id: string | null
  created_at: string
  updated_at: string
  last_message_at: string
}

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

function UserMenu() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 h-10">
          <User className="h-4 w-4" />
          <span className="truncate">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ChatSidebar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareThreadId, setShareThreadId] = useState<string | null>(null)
  const [shareThreadTitle, setShareThreadTitle] = useState("")
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const { hasResumableStreams, resumeStream } = useResumableStreams()
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) {
      console.log("No user, skipping data fetch")
      return
    }

    try {
      console.log("Fetching threads and projects for user:", user.id)
      setLoading(true)
      setError(null)

      const [threadsData, projectsData] = await Promise.all([getThreads(), getProjects()])

      console.log("Fetched threads:", threadsData)
      console.log("Fetched projects:", projectsData)

      setThreads(threadsData || [])
      setProjects(projectsData || [])
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setError(error instanceof Error ? error.message : "Failed to load data")
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch data when user is available
  useEffect(() => {
    if (authLoading) {
      console.log("Auth still loading, waiting...")
      return
    }

    if (!user) {
      console.log("No user authenticated")
      setLoading(false)
      return
    }

    console.log("User authenticated, fetching data...")
    fetchData()
  }, [user, authLoading, fetchData])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return

    console.log("Setting up real-time subscriptions for user:", user.id)

    const threadsChannel = supabase
      .channel("threads_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "threads",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Thread change:", payload)
          if (payload.eventType === "INSERT") {
            setThreads((prev) => [payload.new as Thread, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setThreads((prev) =>
              prev.map((thread) => (thread.id === payload.new.id ? (payload.new as Thread) : thread)),
            )
          } else if (payload.eventType === "DELETE") {
            setThreads((prev) => prev.filter((thread) => thread.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    const projectsChannel = supabase
      .channel("projects_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Project change:", payload)
          if (payload.eventType === "INSERT") {
            setProjects((prev) => [payload.new as Project, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setProjects((prev) =>
              prev.map((project) => (project.id === payload.new.id ? (payload.new as Project) : project)),
            )
          } else if (payload.eventType === "DELETE") {
            setProjects((prev) => prev.filter((project) => project.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      console.log("Cleaning up subscriptions")
      supabase.removeChannel(threadsChannel)
      supabase.removeChannel(projectsChannel)
    }
  }, [user])

  const handleDeleteThread = async (threadId: string) => {
    try {
      await deleteThread(threadId)
      if (id === threadId) {
        navigate("/chat")
      }
      toast.success("Thread deleted")
    } catch (error) {
      console.error("Failed to delete thread:", error)
      toast.error("Failed to delete thread")
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      await deleteProject(projectToDelete.id)
      toast.success(`Project "${projectToDelete.name}" deleted`)
      setDeleteProjectDialogOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      console.error("Failed to delete project:", error)
      toast.error("Failed to delete project")
    }
  }

  const handleShareThread = (threadId: string, title: string) => {
    setShareThreadId(threadId)
    setShareThreadTitle(title)
    setShareDialogOpen(true)
  }

  const handleMoveThread = async (threadId: string, projectId: string | null) => {
    try {
      await moveThreadToProject(threadId, projectId)
      toast.success("Thread moved successfully")
    } catch (error) {
      console.error("Failed to move thread:", error)
      toast.error("Failed to move thread")
    }
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const unorganizedThreads = threads.filter((thread) => !thread.project_id)
  const organizedThreads = threads.filter((thread) => thread.project_id)

  const getProjectThreads = (projectId: string) => {
    return organizedThreads.filter((thread) => thread.project_id === projectId)
  }

  const renderThread = (thread: Thread) => (
    <SidebarMenuItem key={thread.id}>
      <div
        className={cn(
          "cursor-pointer group/thread h-9 flex items-center px-2 py-1 rounded-[8px] overflow-hidden w-full hover:bg-secondary",
          id === thread.id && "bg-secondary",
        )}
        onClick={() => {
          if (id === thread.id) {
            return
          }
          navigate(`/chat/${thread.id}`)
        }}
      >
        <span className="truncate block">{thread.title}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden group-hover/thread:flex ml-auto h-7 w-7"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleShareThread(thread.id, thread.title)
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Folder className="h-4 w-4 mr-2" />
                Move to Project
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleMoveThread(thread.id, null)
                  }}
                >
                  No Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleMoveThread(thread.id, project.id)
                    }}
                  >
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: project.color }} />
                    {project.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDeleteThread(thread.id)
              }}
              className="text-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarMenuItem>
  )

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <Sidebar>
        <div className="flex flex-col h-full p-2">
          <Header />
          <SidebarContent>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </SidebarContent>
          <Footer />
        </div>
      </Sidebar>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Sidebar>
        <div className="flex flex-col h-full p-2">
          <Header />
          <SidebarContent>
            <div className="flex items-center justify-center p-8 text-center">
              <p className="text-muted-foreground">Please log in to view your chats</p>
            </div>
          </SidebarContent>
          <Footer />
        </div>
      </Sidebar>
    )
  }

  return (
    <Sidebar>
      <div className="flex flex-col h-full p-2">
        <Header />
        <SidebarContent className="no-scrollbar">
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-medium">Projects</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCreateProjectOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : error ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-destructive mb-2">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchData}>
                      Retry
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Projects */}
                    {projects.map((project) => {
                      const projectThreads = getProjectThreads(project.id)
                      const isExpanded = expandedProjects.has(project.id)

                      return (
                        <Collapsible key={project.id} open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                          <SidebarMenuItem>
                            <div className="flex items-center gap-2 px-2 py-1 hover:bg-secondary rounded-[8px] group">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                  {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                                </Button>
                              </CollapsibleTrigger>
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                              <span
                                className="text-sm font-medium truncate flex-1 cursor-pointer"
                                onClick={() => navigate(`/project/${project.id}`)}
                              >
                                {project.name}
                              </span>
                              <span className="text-xs text-muted-foreground">{projectThreads.length}</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" side="right">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/project/${project.id}`)
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Manage Project
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setProjectToDelete(project)
                                      setDeleteProjectDialogOpen(true)
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash className="h-4 w-4 mr-2" />
                                    Delete Project
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </SidebarMenuItem>
                          <CollapsibleContent>
                            <div className="ml-6 space-y-1">{projectThreads.map(renderThread)}</div>
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    })}

                    {/* Unorganized Threads */}
                    {unorganizedThreads.length > 0 && (
                      <>
                        <SidebarSeparator />
                        <div className="px-2 py-1">
                          <span className="text-sm font-medium text-muted-foreground">Unorganized</span>
                        </div>
                        {unorganizedThreads.map(renderThread)}
                      </>
                    )}

                    {/* Empty state */}
                    {threads.length === 0 && projects.length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">No chats or projects yet</p>
                        <p className="text-xs text-muted-foreground">Start a new chat to get started!</p>
                      </div>
                    )}
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {hasResumableStreams && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <div className="flex items-center gap-2 px-2 py-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Interrupted Conversations</span>
                </div>
                <SidebarGroupContent>
                  <ResumableStreams
                    onResumeStream={(streamId, threadId, messageId) => {
                      resumeStream(streamId)
                      if (threadId !== id) {
                        navigate(`/chat/${threadId}`)
                      }
                    }}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
        <Footer />
      </div>
      {shareThreadId && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          threadId={shareThreadId}
          threadTitle={shareThreadTitle}
        />
      )}
      <CreateProjectDialog open={createProjectOpen} onOpenChange={setCreateProjectOpen} onSuccess={fetchData} />

      <AlertDialog open={deleteProjectDialogOpen} onOpenChange={setDeleteProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the project "{projectToDelete?.name}"?
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
    </Sidebar>
  )
}

function PureHeader() {
  return (
    <SidebarHeader className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Love<span className="">Chat</span>
        </h1>
        <SidebarTrigger className="h-8 w-8" />
      </div>
      <Link
        to="/chat"
        className={buttonVariants({
          variant: "default",
          className: "w-full",
        })}
      >
        New Chat
      </Link>
    </SidebarHeader>
  )
}

const Header = memo(PureHeader)

const PureFooter = () => {
  return (
    <SidebarFooter className="space-y-2">
      <UserMenu />
      <Link to="/settings" className={buttonVariants({ variant: "outline" })}>
        Settings
      </Link>
    </SidebarFooter>
  )
}

const Footer = memo(PureFooter)
