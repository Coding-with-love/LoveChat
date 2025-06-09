"use client"

import APIKeyForm from "@/frontend/components/APIKeyForm"
import { OllamaSettings } from "@/frontend/components/OllamaSettings"
import ThemeSettings from "@/frontend/components/ThemeSettings"
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
  Paintbrush,
} from "lucide-react"
import { useAuth } from "@/frontend/components/AuthProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card"
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
    } finally {
      setLoadingShares(false)
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

  const MyShares = () => {
    if (loadingShares) {
      return (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-muted">
                <Share2 className="h-4 w-4" />
              </div>
              Shared Conversations
            </CardTitle>
            <CardDescription>Manage your shared conversations and their settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-foreground border-t-transparent"></div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-muted">
              <Share2 className="h-4 w-4" />
            </div>
            Shared Conversations
            <Badge variant="secondary" className="ml-auto">
              {sharedThreads.length}
            </Badge>
          </CardTitle>
          <CardDescription>Manage your shared conversations and their settings</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {sharedThreads.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Share2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No shared conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Share a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedThreads.map((share) => (
                <div
                  key={share.id}
                  className="group relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-medium truncate text-foreground group-hover:text-primary transition-colors">
                        {share.title}
                      </h4>
                      {share.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">{share.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span className="font-medium">{share.view_count}</span>
                          <span>views</span>
                        </div>
                        {share.expires_at && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Expires {format(new Date(share.expires_at), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                        <a href={`/share/${share.share_token}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditShare(share)} className="h-8 w-8 p-0">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteShare(share.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
    )
  }

  const UserInfo = () => {
    if (!user) return null

    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-muted">
              <User className="h-4 w-4" />
            </div>
            Account Information
          </CardTitle>
          <CardDescription>Your account details and authentication status</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <p className="text-sm font-medium text-foreground">{user.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1 break-all">
                {user.id}
              </p>
            </div>
          </div>
          <Separator />
          <Button
            onClick={signOut}
            variant="outline"
            size="sm"
            className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/chat"
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className: "gap-2",
                })}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Chat
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <SettingsIcon className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Settings</h1>
                  <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Account Section */}
          <section>
            <UserInfo />
          </section>

          {/* Theme Settings Section */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-muted">
                    <Paintbrush className="h-4 w-4" />
                  </div>
                  Theme Settings
                </CardTitle>
                <CardDescription>Customize the appearance of the application</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ThemeSettings />
              </CardContent>
            </Card>
          </section>

          {/* Shared Conversations Section */}
          <section>
            <MyShares />
          </section>

          {/* API Configuration Section */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-muted">
                    <Key className="h-4 w-4" />
                  </div>
                  API Configuration
                </CardTitle>
                <CardDescription>Configure your API keys for different AI providers</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <APIKeyForm />
              </CardContent>
            </Card>
          </section>

          {/* Ollama Integration Section */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  Ollama Integration
                </CardTitle>
                <CardDescription>Connect to your local Ollama server and manage models</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <OllamaSettings />
              </CardContent>
            </Card>
          </section>
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
