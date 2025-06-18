"use client"

import APIKeyForm from "@/frontend/components/APIKeyForm"
import { OllamaSettings } from "@/frontend/components/OllamaSettings"
import { ModelManager } from "@/frontend/components/ModelManager"
import CustomizationSettings from "@/frontend/components/CustomizationSettings"
import HistorySyncSettings from "@/frontend/components/HistorySyncSettings"
import AttachmentsSettings from "@/frontend/components/AttachmentsSettings"
import { ArtifactGallery } from "@/frontend/components/ArtifactGallery"
import { CreateArtifactDialog } from "@/frontend/components/CreateArtifactDialog"
import { Link } from "react-router"
import { buttonVariants } from "../components/ui/button"
import {
  ArrowLeftIcon,
  User,
  Share2,
  Eye,
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
  Clock,
  Lock,
  Globe,
  Plus,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select"

function Settings() {
  const [sharedThreads, setSharedThreads] = useState<any[]>([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [editingShare, setEditingShare] = useState<any>(null)
  const [showForceLoadShares, setShowForceLoadShares] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("account")
  const [createArtifactOpen, setCreateArtifactOpen] = useState(false)
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

      // Add timeout to prevent infinite loading (increased to 30 seconds)
      const loadPromise = getUserSharedThreads()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Load shared threads timeout")), 30000),
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

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard!")
    }

    return (
      <div className="space-y-8">
        <Card className="shadow-sm border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold">Account Information</CardTitle>
                <CardDescription className="text-base">Manage your login email and user ID</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Account Details Panel */}
            <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-6 border border-border/50 space-y-6">
              {/* Email Address Section */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Email Address</label>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm"></div>
                  <p className="text-sm font-medium text-muted-foreground flex-1">{user.email}</p>
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800 px-3 py-1 font-medium shadow-sm"
                  >
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verified
                    </div>
                  </Badge>
                </div>
              </div>

              {/* User ID Section */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">User ID</label>
                <div className="group relative p-4 rounded-lg bg-card border border-border/50 shadow-sm hover:border-primary/30 transition-colors">
                  <p className="text-xs font-mono text-muted-foreground break-all pr-8">{user.id}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(user.id)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Sign Out Section */}
            <div className="flex justify-end">
              <Button
                onClick={signOut}
                variant="outline"
                size="lg"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200 font-medium px-8"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </Button>
            </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <Archive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Artifact Management</CardTitle>
                <CardDescription>Manage your saved artifacts, code snippets, and generated content</CardDescription>
              </div>
            </div>
            <Button onClick={() => setCreateArtifactOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Artifact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ArtifactGallery showHeader={false} />
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
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">Shared Conversations</CardTitle>
                <Badge
                  variant="secondary"
                  className="text-sm bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800"
                >
                  {sharedThreads.length} shared
                </Badge>
              </div>
              <CardDescription>Manage your shared conversations and their settings</CardDescription>
            </div>
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
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-3xl flex items-center justify-center mb-6 border border-cyan-200/50 dark:border-cyan-800/50">
                <div className="relative">
                  <Share2 className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">💬</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">No shared conversations yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                You haven't shared any conversations yet. Click the "Share" icon in a conversation to publish it and
                make it accessible to others.
              </p>
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 border border-cyan-200/50 dark:border-cyan-800/50 rounded-xl p-4 max-w-sm mx-auto">
                <p className="text-xs text-cyan-700 dark:text-cyan-300 font-medium">
                  💡 Tip: Shared conversations can be password-protected and set to expire automatically
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedThreads.map((share) => (
                <div
                  key={share.id}
                  className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/20 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/2"
                >
                  <div className="flex items-start gap-4">
                    {/* Conversation Icon */}
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl flex items-center justify-center border border-cyan-200/50 dark:border-cyan-800/50 group-hover:scale-105 transition-transform duration-200">
                      <div className="relative">
                        <span className="text-lg">💬</span>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full border border-white dark:border-gray-900"></div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold truncate text-foreground group-hover:text-primary transition-colors">
                          {share.title}
                        </h4>
                        {share.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {share.description}
                          </p>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-muted/60 to-muted/40 rounded-full px-3 py-1.5 border border-border/50">
                          <Eye className="h-3 w-3 text-blue-600" />
                          <span className="font-semibold text-foreground">{share.view_count}</span>
                          <span className="text-muted-foreground">views</span>
                        </div>
                        {share.expires_at && (
                          <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 text-orange-700 dark:text-orange-300 rounded-full px-3 py-1.5 border border-orange-200/50 dark:border-orange-800/50">
                            <Clock className="h-3 w-3" />
                            <span>Expires {format(new Date(share.expires_at), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        {share.password_hash && (
                          <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 text-purple-700 dark:text-purple-300 rounded-full px-3 py-1.5 border border-purple-200/50 dark:border-purple-800/50">
                            <Lock className="h-3 w-3" />
                            <span>Protected</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 rounded-full px-3 py-1.5 border border-green-200/50 dark:border-green-800/50">
                          {share.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          <span>{share.is_public ? "Public" : "Private"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <div className="flex items-center bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-1 shadow-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                          title="Copy Share Link"
                        >
                          <a href={`/share/${share.share_token}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditShare(share)}
                          className="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-600 transition-colors"
                          title="Edit Share Settings"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteShare(share.id)}
                          className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-600 transition-colors"
                          title="Delete Share"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                <Button onClick={handleForceUnstickSettings} variant="outline" size="sm" className="gap-2 text-xs">
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
            <Button onClick={handleForceUnstickSettings} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Force Load
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* Mobile Dropdown Selector */}
            <div className="lg:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full h-12 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 backdrop-blur-xl border border-border/50 shadow-lg">
                  <SelectValue>
                    <div className="flex items-center gap-3">
                      {activeTab === "account" && (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-medium">Account</span>
                        </>
                      )}
                      {activeTab === "customization" && (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20">
                            <Sliders className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="font-medium">Customization</span>
                        </>
                      )}
                      {activeTab === "history" && (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20">
                            <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <span className="font-medium">History</span>
                        </>
                      )}
                      {activeTab === "attachments" && (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
                            <Paperclip className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          <span className="font-medium">Attachments</span>
                        </>
                      )}
                      {activeTab === "artifacts" && (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                            <Archive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="font-medium">Artifacts</span>
                        </>
                      )}
                      {activeTab === "api-keys" && (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                            <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="font-medium">API Keys</span>
                        </>
                      )}
                      {activeTab === "models" && (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                            <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="font-medium">Models</span>
                        </>
                      )}
                      {activeTab === "sharing" && (
                        <>
                          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                            <Share2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <span className="font-medium">Sharing</span>
                        </>
                      )}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="account">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium">Account</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="customization">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20">
                        <Sliders className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-medium">Customization</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="history">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20">
                        <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span className="font-medium">History</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="attachments">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
                        <Paperclip className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="font-medium">Attachments</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="artifacts">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                        <Archive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-medium">Artifacts</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="api-keys">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                        <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="font-medium">API Keys</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="models">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                        <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium">Models</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sharing">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                        <Share2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span className="font-medium">Sharing</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Tab List */}
            <TabsList className="hidden lg:grid w-full grid-cols-8 h-auto p-2 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 backdrop-blur-xl border border-border/50 shadow-lg rounded-xl">
              <TabsTrigger
                value="account"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/5 hover:shadow-md group"
              >
                <User className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">Account</span>
              </TabsTrigger>
              <TabsTrigger
                value="customization"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/5 hover:shadow-md group"
              >
                <Sliders className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">Customization</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/5 hover:shadow-md group"
              >
                <History className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">History</span>
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/5 hover:shadow-md group"
              >
                <Paperclip className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">Attachments</span>
              </TabsTrigger>
              <TabsTrigger
                value="artifacts"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/5 hover:shadow-md group"
              >
                <Archive className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">Artifacts</span>
              </TabsTrigger>
              <TabsTrigger
                value="api-keys"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/5 hover:shadow-md group"
              >
                <Key className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">API Keys</span>
              </TabsTrigger>
              <TabsTrigger
                value="models"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/5 hover:shadow-md group"
              >
                <Bot className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">Models</span>
              </TabsTrigger>
              <TabsTrigger
                value="sharing"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/15 data-[state=active]:to-primary/5 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 rounded-lg transition-all duration-300 hover:bg-primary/5 hover:shadow-md group"
              >
                <Share2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">Sharing</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-8 animate-in fade-in-50 duration-300">
              <AccountTab />
            </TabsContent>

            <TabsContent value="customization" className="mt-8 animate-in fade-in-50 duration-300">
              <CustomizationTab />
            </TabsContent>

            <TabsContent value="history" className="mt-8 animate-in fade-in-50 duration-300">
              <HistorySyncTab />
            </TabsContent>

            <TabsContent value="attachments" className="mt-8 animate-in fade-in-50 duration-300">
              <AttachmentsTab />
            </TabsContent>

            <TabsContent value="artifacts" className="mt-8 animate-in fade-in-50 duration-300">
              <ArtifactsTab />
            </TabsContent>

            <TabsContent value="api-keys" className="mt-8 animate-in fade-in-50 duration-300">
              <APIKeysTab />
            </TabsContent>

            <TabsContent value="models" className="mt-8 animate-in fade-in-50 duration-300">
              <ModelsTab />
            </TabsContent>

            <TabsContent value="sharing" className="mt-8 animate-in fade-in-50 duration-300">
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

      {/* Create Artifact Dialog */}
      <CreateArtifactDialog
        open={createArtifactOpen}
        onOpenChange={setCreateArtifactOpen}
      />
    </div>
  )
}

export default Settings
