"use client"

import APIKeyForm from "@/frontend/components/APIKeyForm"
import { OllamaSettings } from "@/frontend/components/OllamaSettings"
import ThemeSettings from "@/frontend/components/ThemeSettings"
import { ModelManager } from "@/frontend/components/ModelManager"
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
  Palette,
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

function Settings() {
  const [sharedThreads, setSharedThreads] = useState<any[]>([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [editingShare, setEditingShare] = useState<any>(null)
  const { user, signOut } = useAuth()

  const loadSharedThreads = async () => {
    try {
      setLoadingShares(true)
      const shares = await getUserSharedThreads()
      setSharedThreads(shares)
    } catch (error) {
      console.error("Failed to load shared threads:", error)
      toast.error("Failed to load shared conversations")
    } finally {
      setLoadingShares(false)
    }
  }

  useEffect(() => {
    loadSharedThreads()
  }, [])

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

  // Theme Tab Content
  const ThemeTab = () => (
    <div className="space-y-6">
      <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20">
              <Palette className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Theme Settings</CardTitle>
              <CardDescription>Customize the appearance and feel of the application</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ThemeSettings />
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
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="account" className="space-y-8">
            <TabsList className="grid w-full grid-cols-5 h-auto p-1.5 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 backdrop-blur-xl border border-border/50 shadow-lg">
              <TabsTrigger
                value="account"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500/10 data-[state=active]:to-purple-500/10 data-[state=active]:border data-[state=active]:border-blue-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <User className="h-4 w-4" />
                <span className="text-xs font-medium">Account</span>
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
                value="theme"
                className="flex flex-col gap-2 py-4 px-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500/10 data-[state=active]:to-teal-500/10 data-[state=active]:border data-[state=active]:border-green-500/20 data-[state=active]:shadow-md rounded-lg transition-all duration-300"
              >
                <Palette className="h-4 w-4" />
                <span className="text-xs font-medium">Theme</span>
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

            <TabsContent value="api-keys" className="mt-8">
              <APIKeysTab />
            </TabsContent>

            <TabsContent value="models" className="mt-8">
              <ModelsTab />
            </TabsContent>

            <TabsContent value="theme" className="mt-8">
              <ThemeTab />
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
