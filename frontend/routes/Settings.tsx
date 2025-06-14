"use client"

import APIKeyForm from "@/frontend/components/APIKeyForm"
import { OllamaSettings } from "@/frontend/components/OllamaSettings"
import { ModelManager } from "@/frontend/components/ModelManager"
import CustomizationSettings from "@/frontend/components/CustomizationSettings"
import HistorySyncSettings from "@/frontend/components/HistorySyncSettings"
import AttachmentsSettings from "@/frontend/components/AttachmentsSettings"
import { ArtifactGallery } from "@/frontend/components/ArtifactGallery"
import { Link } from "react-router"
import { buttonVariants } from "../components/ui/button"
import {
  ArrowLeftIcon,
  User,
  Share2,
  Eye,
  Calendar,
  Trash2,
  ExternalLink,
  SettingsIcon,
  Key,
  Bot,
  Sliders,
  History,
  Paperclip,
  Archive,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "@/frontend/components/AuthProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs"
import { getUserSharedThreads, deleteSharedThread } from "@/lib/supabase/queries"
import { format } from "date-fns"
import ShareDialog from "@/frontend/components/ShareDialog"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { Separator } from "@/frontend/components/ui/separator"
import { useTabVisibility } from "@/frontend/hooks/useTabVisibility"

function Settings() {
  const [sharedThreads, setSharedThreads] = useState<any[]>([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [editingShare, setEditingShare] = useState<any>(null)
  const [showForceLoadShares, setShowForceLoadShares] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(true)
  const { user, signOut } = useAuth()

  // Add tab visibility management to refresh state when returning to settings
  useTabVisibility({
    onVisible: () => {
      console.log("🔄 Settings page became visible, refreshing shared threads")
      loadSharedThreads(true) // Pass true to indicate this is a refresh
    },
    refreshStoresOnVisible: false, // Don't refresh stores here - APIKeyForm handles its own state
  })

  // Global loading timeout to prevent the entire settings page from being stuck
  useEffect(() => {
    const globalLoadingTimeout = setTimeout(() => {
      if (globalLoading) {
        console.warn("⚠️ Settings page global loading timeout - forcing display")
        setGlobalLoading(false)
      }
    }, 3000) // 3 second timeout for global loading

    return () => clearTimeout(globalLoadingTimeout)
  }, [globalLoading])

  // Clear global loading when user is available
  useEffect(() => {
    if (user) {
      setGlobalLoading(false)
    }
  }, [user])

  const loadSharedThreads = async (isRefresh = false) => {
    try {
      console.log("🔄 Loading shared threads", isRefresh ? "(refresh)" : "(initial)")
      setLoadingShares(true)

      // Add timeout to prevent infinite loading
      const loadPromise = getUserSharedThreads()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Load shared threads timeout")), 10000),
      )

      const shares = (await Promise.race([loadPromise, timeoutPromise])) as any[]
      setSharedThreads(shares)
      console.log("✅ Shared threads loaded:", shares.length)
    } catch (error) {
      console.error("❌ Failed to load shared threads:", error)
      toast.error("Failed to load shared conversations")

      // On error, keep existing threads if we have them
      if (sharedThreads.length > 0) {
        console.log("💾 Keeping existing shared threads on error")
      }
    } finally {
      // Always clear loading state
      setLoadingShares(false)
      console.log("🔄 Shared threads loading state cleared")
    }
  }

  useEffect(() => {
    loadSharedThreads()
  }, [])

  // Show force load button after 5 seconds, auto-clear after 15 seconds
  useEffect(() => {
    if (loadingShares) {
      const forceLoadTimer = setTimeout(() => {
        setShowForceLoadShares(true)
      }, 5000)

      const autoRecoveryTimer = setTimeout(() => {
        if (loadingShares) {
          console.warn("⚠️ Auto-clearing stuck sharing loading state")
          setLoadingShares(false)
          setShowForceLoadShares(false)
        }
      }, 15000)

      return () => {
        clearTimeout(forceLoadTimer)
        clearTimeout(autoRecoveryTimer)
      }
    } else {
      setShowForceLoadShares(false)
    }
  }, [loadingShares])

  const handleForceLoadShares = () => {
    console.log("🔧 Force clearing sharing loading state")
    setLoadingShares(false)
    setShowForceLoadShares(false)
  }

  // Add a force clear all loading states function
  const handleForceUnstickSettings = () => {
    console.log("🔧 Force clearing all Settings loading states")
    setGlobalLoading(false)
    setLoadingShares(false)
    setShowForceLoadShares(false)
    toast.success("Settings page refreshed")
  }

  const handleDeleteShare = async (shareId: string) => {
    try {
      await deleteSharedThread(shareId)
      setSharedThreads((prev) => prev.filter((share) => share.id !== shareId))
      toast.success("Share deleted successfully")
    } catch (error) {
      console.error("Failed to delete share:", error)
      toast.error("Failed to delete share")
    }
  }

  const handleEditShare = (share: any) => {
    setEditingShare(share)
    setShareDialogOpen(true)
  }

  const handleShareDialogClose = () => {
    setShareDialogOpen(false)
    setEditingShare(null)
    loadSharedThreads()
  }

  // Account Tab Content
  const AccountTab = () => {
    if (!user) return null

    return (
      <div className="space-y-6">
        <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Account Information</CardTitle>
                <CardDescription>Your profile and authentication details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <p className="text-sm font-medium">{user.email}</p>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Verified
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-mono text-muted-foreground break-all">{user.id}</p>
                </div>
              </div>
            </div>
            <Separator />
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // API Keys Tab Content
  const APIKeysTab = () => (
    <div className="space-y-6">
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl">API Configuration</CardTitle>
              <CardDescription>Configure your API keys for different AI providers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <APIKeyForm />
        </CardContent>
      </Card>
    </div>
  )

  // Models Tab Content
  const ModelsTab = () => (
    <div className="space-y-6">
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Model Management</CardTitle>
              <CardDescription>Manage your AI models and quick access preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ModelManager />
        </CardContent>
      </Card>

      {/* Ollama Settings */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
              <Bot className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Ollama Integration</CardTitle>
              <CardDescription>Connect to your local Ollama server and discover models</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OllamaSettings />
        </CardContent>
      </Card>
    </div>
  )

  // Customization Tab Content
  const CustomizationTab = () => <CustomizationSettings />

  // History & Sync Tab Content
  const HistorySyncTab = () => <HistorySyncSettings />

  // Attachments Tab Content
  const AttachmentsTab = () => <AttachmentsSettings />

  // Artifacts Tab Content
  const ArtifactsTab = () => (
    <div className="space-y-6">
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <Archive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Artifact Management</CardTitle>
              <CardDescription>Manage your saved artifacts, code snippets, and generated content</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ArtifactGallery />
        </CardContent>
      </Card>
    </div>
  )

  // Sharing Tab Content
  const SharingTab = () => (
    <div className="space-y-6">
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <Share2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Shared Conversations</CardTitle>
              <CardDescription>Manage your shared conversations and their settings</CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {sharedThreads.length} shared
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingShares ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading shared conversations...</p>
              {showForceLoadShares && (
                <Button onClick={handleForceLoadShares} variant="outline" size="sm">
                  Force Load
                </Button>
              )}
            </div>
          ) : sharedThreads.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mb-4">
                <Share2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No shared conversations</h3>
              <p className="text-sm text-muted-foreground">Share a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedThreads.map((share) => (
                <div
                  key={share.id}
                  className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-4 hover:shadow-lg transition-all duration-300 hover:border-primary/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                        {share.title}
                      </h4>
                      {share.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">{share.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                          <Eye className="h-3 w-3" />
                          <span className="font-medium">{share.view_count}</span>
                          <span>views</span>
                        </div>
                        {share.expires_at && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                            <Calendar className="h-3 w-3" />
                            <span>Expires {format(new Date(share.expires_at), "MMM d")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 hover:bg-primary/10">
                        <a href={`/share/${share.share_token}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditShare(share)}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteShare(share.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/chat"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "gap-2 hover:bg-primary/10",
              })}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Chat
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
              </div>
            </div>
            
            {/* Global loading indicator and force unstick button */}
            <div className="ml-auto flex items-center gap-2">
              {globalLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                  <span>Loading...</span>
                </div>
              )}
              {(loadingShares || showForceLoadShares) && (
                <Button
                  onClick={handleForceUnstickSettings}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Fix Loading
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global loading overlay */}
      {globalLoading && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-background border shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading Settings...</p>
            <Button
              onClick={handleForceUnstickSettings}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Force Load
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="account" className="space-y-8">
            <TabsList className="grid w-full grid-cols-8 h-auto p-1.5 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 backdrop-blur-xl border border-border/50 shadow-lg">
              <TabsTrigger
                value="account"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500/10 data-[state=active]:to-purple-500/10 data-[state=active]:border data-[state=active]:border-blue-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <User className="h-4 w-4" />
                <span className="text-xs font-medium">Account</span>
              </TabsTrigger>
              <TabsTrigger
                value="customization"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500/10 data-[state=active]:to-teal-500/10 data-[state=active]:border data-[state=active]:border-green-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <Sliders className="h-4 w-4" />
                <span className="text-xs font-medium">Customization</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-500/10 data-[state=active]:to-blue-500/10 data-[state=active]:border data-[state=active]:border-indigo-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <History className="h-4 w-4" />
                <span className="text-xs font-medium">History</span>
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500/10 data-[state=active]:to-indigo-500/10 data-[state=active]:border data-[state=active]:border-violet-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <Paperclip className="h-4 w-4" />
                <span className="text-xs font-medium">Attachments</span>
              </TabsTrigger>
              <TabsTrigger
                value="artifacts"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500/10 data-[state=active]:to-teal-500/10 data-[state=active]:border data-[state=active]:border-emerald-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <Archive className="h-4 w-4" />
                <span className="text-xs font-medium">Artifacts</span>
              </TabsTrigger>
              <TabsTrigger
                value="api-keys"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500/10 data-[state=active]:to-orange-500/10 data-[state=active]:border data-[state=active]:border-amber-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <Key className="h-4 w-4" />
                <span className="text-xs font-medium">API Keys</span>
              </TabsTrigger>
              <TabsTrigger
                value="models"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500/10 data-[state=active]:to-pink-500/10 data-[state=active]:border data-[state=active]:border-purple-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <Bot className="h-4 w-4" />
                <span className="text-xs font-medium">Models</span>
              </TabsTrigger>
              <TabsTrigger
                value="sharing"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/10 data-[state=active]:to-blue-500/10 data-[state=active]:border data-[state=active]:border-cyan-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-xs font-medium">Sharing</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-8">
              <AccountTab />
            </TabsContent>

            <TabsContent value="customization" className="mt-8">
              <CustomizationTab />
            </TabsContent>

            <TabsContent value="history" className="mt-8">
              <HistorySyncTab />
            </TabsContent>

            <TabsContent value="attachments" className="mt-8">
              <AttachmentsTab />
            </TabsContent>

            <TabsContent value="artifacts" className="mt-8">
              <ArtifactsTab />
            </TabsContent>

            <TabsContent value="api-keys" className="mt-8">
              <APIKeysTab />
            </TabsContent>

            <TabsContent value="models" className="mt-8">
              <ModelsTab />
            </TabsContent>

            <TabsContent value="sharing" className="mt-8">
              <SharingTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Share Dialog */}
      {editingShare && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={handleShareDialogClose}
          threadId={editingShare.thread_id}
          threadTitle={editingShare.title}
          existingShare={editingShare}
        />
      )}
    </div>
  )
}

export default Settings
