"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/frontend/components/ui/sidebar"
import { Button, buttonVariants } from "./ui/button"
import { Input } from "./ui/input"
import { deleteThread, getThreads, getProjects, moveThreadToProject, deleteProject } from "@/lib/supabase/queries"
import { supabase } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useTabVisibility } from "@/frontend/hooks/useTabVisibility"
import {
  User,
  LogOut,
  Share2,
  FolderOpen,
  Folder,
  Plus,
  MoreHorizontal,
  Edit,
  Edit2,
  Loader2,
  Trash,
  MessageSquarePlus,
  Check,
  X,
  HelpCircle,
  Keyboard,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog"
import { useSidebar } from "./ui/sidebar"

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

function ProfileSection() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const displayName = profile?.full_name || profile?.username || user.email?.split("@")[0] || "User"
  const avatarUrl = profile?.avatar_url

  return (
    <div className="p-4 border-b border-border/50">
      <div className="flex items-center mb-3">
        <h1 className="text-lg font-bold">LoveChat</h1>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-2 hover:bg-secondary">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl || "/placeholder.svg"}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2">
            <User className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function ChatSidebar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForceLoad, setShowForceLoad] = useState(false)
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed'

  // Add tab visibility management to refresh sidebar when returning
  useTabVisibility({
    onVisible: () => {
      console.log("🔄 Sidebar became visible, checking state:", {
        threadsCount: threads.length,
        projectsCount: projects.length,
        hasUser: !!user,
        isLoading: loading,
      })

      // Always do a gentle refresh to ensure data is up-to-date
      // This ensures any stuck loading states are cleared
      fetchData(true) // Pass true to indicate this is a refresh
    },
    refreshStoresOnVisible: false, // Don't refresh API key stores - let specific components handle that
  })
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareThreadId, setShareThreadId] = useState<string | null>(null)
  const [shareThreadTitle, setShareThreadTitle] = useState("")
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const [openDropdownThreadId, setOpenDropdownThreadId] = useState<string | null>(null)

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        console.log("No user, skipping data fetch")
        return
      }

      try {
        console.log("Fetching threads and projects for user:", user.id, isRefresh ? "(refresh)" : "(initial)")

        // For initial load, show loading state
        // For refresh, ensure loading is false (in case it was stuck)
        if (isRefresh) {
          setLoading(false) // Clear any stuck loading state
        } else {
          setLoading(true)
        }
        setError(null)

        const [threadsData, projectsData] = await Promise.all([getThreads(), getProjects()])

        console.log(
          "Fetched threads:",
          threadsData?.length || 0,
          "projects:",
          projectsData?.length || 0,
          isRefresh ? "(refresh)" : "(initial)",
        )

        setThreads(threadsData || [])
        setProjects(projectsData || [])
      } catch (error) {
        console.error("Failed to fetch data:", error)
        setError(error instanceof Error ? error.message : "Failed to load data")
        toast.error("Failed to load data")
      } finally {
        // Always ensure loading is false when done, regardless of refresh type
        setLoading(false)
      }
    },
    [user],
  )

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

  // Force load mechanism - show force load button after 5 seconds
  useEffect(() => {
    if (loading && !authLoading && user) {
      const timer = setTimeout(() => {
        setShowForceLoad(true)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowForceLoad(false)
    }
  }, [loading, authLoading, user])

  const handleForceLoad = () => {
    console.log("🔧 Force loading ChatSidebar data")
    setLoading(false)
    setShowForceLoad(false)
    setError(null)

    // Keep existing data if we have it
    if (threads.length === 0 && projects.length === 0) {
      console.log("📋 No existing data, setting empty state")
      setThreads([])
      setProjects([])
    }
  }

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

  const handleStartRename = (threadId: string, currentTitle: string) => {
    setEditingThreadId(threadId)
    setEditingTitle(currentTitle)
  }

  const handleSaveRename = async () => {
    if (!editingThreadId || !editingTitle.trim()) return

    try {
      const { error } = await supabase
        .from("threads")
        .update({ title: editingTitle.trim(), updated_at: new Date().toISOString() })
        .eq("id", editingThreadId)
        .eq("user_id", user?.id)

      if (error) throw error

      setEditingThreadId(null)
      setEditingTitle("")
      toast.success("Thread renamed successfully")
    } catch (error) {
      console.error("Failed to rename thread:", error)
      toast.error("Failed to rename thread")
    }
  }

  const handleCancelRename = () => {
    setEditingThreadId(null)
    setEditingTitle("")
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

  const renderThread = (thread: Thread) => {
    const isEditing = editingThreadId === thread.id

    return (
      <SidebarMenuItem key={thread.id}>
        <div
          className={cn(
            "cursor-pointer group/thread h-9 flex items-center px-2 py-1 rounded-[8px] overflow-hidden w-full hover:bg-secondary",
            id === thread.id && "bg-secondary",
            isEditing && "bg-secondary",
          )}
          onClick={() => {
            if (isEditing || id === thread.id) {
              return
            }
            navigate(`/chat/${thread.id}`)
          }}
        >
          {isEditing ? (
            <div className="flex items-center gap-1 w-full">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveRename()
                  } else if (e.key === "Escape") {
                    handleCancelRename()
                  }
                }}
                className="h-7 text-sm flex-1"
                autoFocus
                onBlur={handleSaveRename}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveRename()
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCancelRename()
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <span className="truncate block">{thread.title}</span>
              <DropdownMenu modal={false} onOpenChange={(open) => setOpenDropdownThreadId(open ? thread.id : null)}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "ml-auto h-7 w-7",
                      openDropdownThreadId === thread.id ? "flex" : "hidden group-hover/thread:flex"
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-48" sideOffset={5} avoidCollisions={true}>
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
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleStartRename(thread.id, thread.title)
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
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
            </>
          )}
        </div>
      </SidebarMenuItem>
    )
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <Sidebar className="sidebar-with-spacing" data-collapsed={collapsed}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border/50">
            <h1 className="text-lg font-bold">LoveChat</h1>
          </div>
          <SidebarContent>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </SidebarContent>
        </div>
      </Sidebar>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Sidebar className="sidebar-with-spacing" data-collapsed={collapsed}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border/50">
            <h1 className="text-lg font-bold">LoveChat</h1>
          </div>
          <SidebarContent>
            <div className="flex items-center justify-center p-8 text-center">
              <p className="text-muted-foreground">Please log in to view your chats</p>
            </div>
          </SidebarContent>
        </div>
      </Sidebar>
    )
  }

  return (
    <>
      <Sidebar className="sidebar-with-spacing" data-collapsed={collapsed}>
        <div className="flex flex-col h-full">
          <ProfileSection />
          <div className="p-4 border-b border-border/50">
            <Link to="/chat" className={cn(buttonVariants({ variant: "default" }), "w-full justify-center gap-2")}>
              <MessageSquarePlus className="h-4 w-4" />
              New Chat
            </Link>
          </div>
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
                    <div className="flex flex-col items-center justify-center p-4 space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading...</p>
                      {showForceLoad && (
                        <Button variant="outline" size="sm" onClick={handleForceLoad}>
                          Force Load
                        </Button>
                      )}
                    </div>
                  ) : error ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-destructive mb-2">{error}</p>
                      <Button variant="outline" size="sm" onClick={() => fetchData()}>
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
                          <Collapsible
                            key={project.id}
                            open={isExpanded}
                            onOpenChange={() => toggleProject(project.id)}
                          >
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
                                <DropdownMenu modal={false}>
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
                                  <DropdownMenuContent
                                    align="end"
                                    side="right"
                                    className="w-48"
                                    sideOffset={5}
                                  >
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
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto border-t border-border/50">
            <div className="flex items-center justify-between w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    className="gap-2"
                    onSelect={(e) => {
                      e.preventDefault()
                      setIsKeyboardShortcutsOpen(true)
                    }}
                  >
                    <Keyboard className="h-4 w-4" />
                    Keyboard Shortcuts
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2">
                    <Info className="h-4 w-4" />
                    Version 0.0.1
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sidebar toggle button aligned with help button */}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
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

        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog
          trigger={<div style={{ display: "none" }} />}
          open={isKeyboardShortcutsOpen}
          onOpenChange={setIsKeyboardShortcutsOpen}
        />
      </Sidebar>

      {/* Collapsed sidebar toggle button */}
      {collapsed && (
        <Button
          className="fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full shadow-md"
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </>
  )
}
