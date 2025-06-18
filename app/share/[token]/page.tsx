"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getSharedThread, getSharedThreadMessages } from "@/lib/supabase/queries"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Badge } from "@/frontend/components/ui/badge"
import { Lock, Eye, Calendar, MessageSquare, Share2, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import type { UIMessage } from "ai"
import MarkdownRenderer from "@/frontend/components/MemoizedMarkdown"
import FileAttachmentViewer from "@/frontend/components/FileAttachmentViewer"
import MessageSources from "@/frontend/components/MessageSources"
import WebSearchBanner from "@/frontend/components/WebSearchBanner"

interface DBMessage {
  id: string
  thread_id: string
  user_id: string
  parts: any
  content: string
  role: "user" | "assistant" | "system" | "data"
  created_at: string
}

interface SharedThread {
  id: string
  thread_id: string
  user_id: string
  share_token: string
  title: string
  description: string | null
  is_public: boolean
  password_hash: string | null
  expires_at: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export default function SharedConversationPage() {
  const { token } = useParams()
  const [sharedThread, setSharedThread] = useState<SharedThread | null>(null)
  const [messages, setMessages] = useState<DBMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [needsPassword, setNeedsPassword] = useState(false)
  const [verifyingPassword, setVerifyingPassword] = useState(false)

  const loadSharedConversation = async (passwordAttempt?: string) => {
    try {
      setLoading(true)
      setError(null)

      // Get shared thread info
      const shared = await getSharedThread(token as string, passwordAttempt)
      setSharedThread(shared)

      // Get messages
      const msgs = await getSharedThreadMessages(token as string)
      setMessages(msgs)
      setNeedsPassword(false)
    } catch (err) {
      console.error("Failed to load shared conversation:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load conversation"

      if (errorMessage === "Password required") {
        setNeedsPassword(true)
        setError(null)
      } else if (errorMessage === "Invalid password") {
        setError("Invalid password. Please try again.")
        setNeedsPassword(true)
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
      setVerifyingPassword(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadSharedConversation()
    }
  }, [token])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setVerifyingPassword(true)
    await loadSharedConversation(password)
  }

  const convertToUIMessages = (messages: DBMessage[]): UIMessage[] => {
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      parts: message.parts as UIMessage["parts"],
      content: message.content || "",
      createdAt: new Date(message.created_at),
    }))
  }

  if (loading && !needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared conversation...</p>
        </div>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>Password Protected</CardTitle>
            <CardDescription>This shared conversation is protected with a password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={verifyingPassword}>
                {verifyingPassword ? "Verifying..." : "Access Conversation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sharedThread) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Conversation not found</p>
      </div>
    )
  }

  const uiMessages = convertToUIMessages(messages)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{sharedThread.title}</h1>
                {sharedThread.description && (
                  <p className="text-sm text-muted-foreground">{sharedThread.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {sharedThread.view_count} views
              </Badge>
              {sharedThread.expires_at && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expires {format(new Date(sharedThread.expires_at), "MMM d, yyyy")}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {uiMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No messages in this conversation</p>
            </div>
          ) : (
            <div className="space-y-8">
              {uiMessages.map((message) => {
                // Extract file attachments and sources using type assertion for custom part types
                const fileAttachments =
                  (message.parts as any)?.find((part: any) => part.type === "file_attachments")?.attachments || []
                const sources = (message.parts as any)?.find((part: any) => part.type === "sources")?.sources || []
                const usedWebSearch = sources.length > 0

                // Filter display parts
                const displayParts =
                  message.parts?.filter((part) => part.type === "text" || part.type === "reasoning") || []

                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {/* Web Search Banner for Assistant Messages */}
                    {message.role === "assistant" && usedWebSearch && (
          <WebSearchBanner 
            query={sources[0]?.query || "Web search"}
            resultCount={sources.length || 7}
            searchResults={sources.map((source: any) => ({
              title: source.title || source.name || "Search Result",
              snippet: source.snippet || source.description || source.text || "",
              url: source.url || source.link || "#",
              source: source.source || source.domain
            }))}
          />
        )}

                    {displayParts.map((part, index) => {
                      if (part.type === "text") {
                        // CRITICAL FIX: Use message.content if available (for updated messages), otherwise fall back to part.text
                        // This ensures that rephrased text saved to the database is displayed correctly
                        const textContent = message.content || part.text
                        
                        return message.role === "user" ? (
                          <div
                            key={index}
                            className="px-4 py-3 rounded-xl bg-secondary border border-secondary-foreground/2 max-w-[80%]"
                          >
                            <p>{textContent}</p>
                          </div>
                        ) : (
                          <div key={index} className="w-full">
                            <div
                              className={`transition-all duration-300 ${
                                usedWebSearch &&
                                "border-l-4 border-border pl-4 bg-muted/20 rounded-lg shadow-sm"
                              }`}
                            >
                              <MarkdownRenderer content={textContent} id={message.id} />
                            </div>
                          </div>
                        )
                      }
                      return null
                    })}

                    {/* Display sources if available */}
                    {sources.length > 0 && message.role === "assistant" && <MessageSources sources={sources} />}

                    {/* Render file attachments if any */}
                    {fileAttachments.length > 0 && (
                      <div className={`mt-2 ${message.role === "user" ? "self-end max-w-[80%]" : "self-start w-full"}`}>
                        <FileAttachmentViewer attachments={fileAttachments} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Shared on {format(new Date(sharedThread.created_at), "MMMM d, yyyy")} • Powered by LoveChat
          </p>
        </div>
      </footer>
    </div>
  )
}
