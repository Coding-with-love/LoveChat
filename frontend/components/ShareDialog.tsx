"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { CalendarIcon, Copy, Check, Share2, Eye, Lock, Clock, Globe, EyeOff } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { createSharedThread, updateSharedThread } from "@/lib/supabase/queries"
import { toast } from "sonner"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadId: string
  threadTitle: string
  existingShare?: {
    id: string
    share_token: string
    title: string
    description: string | null
    is_public: boolean
    password_hash: string | null
    expires_at: string | null
    view_count: number
  }
  onShareCreated?: (share: any) => void
}

export default function ShareDialog({
  open,
  onOpenChange,
  threadId,
  threadTitle,
  existingShare,
  onShareCreated,
}: ShareDialogProps) {
  const [title, setTitle] = useState(existingShare?.title || threadTitle)
  const [description, setDescription] = useState(existingShare?.description || "")
  const [isPublic, setIsPublic] = useState(existingShare?.is_public ?? true)
  const [password, setPassword] = useState("")
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    existingShare?.expires_at ? new Date(existingShare.expires_at) : undefined,
  )
  const [expiryOption, setExpiryOption] = useState<string>(existingShare?.expires_at ? "custom" : "never")
  const [shareUrl, setShareUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (existingShare) {
      setShareUrl(`${window.location.origin}/share/${existingShare.share_token}`)
    }
  }, [existingShare])

  const handleExpiryOptionChange = (value: string) => {
    setExpiryOption(value)
    const now = new Date()

    switch (value) {
      case "1hour":
        setExpiresAt(new Date(now.getTime() + 60 * 60 * 1000))
        break
      case "1day":
        setExpiresAt(new Date(now.getTime() + 24 * 60 * 60 * 1000))
        break
      case "1week":
        setExpiresAt(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
        break
      case "1month":
        setExpiresAt(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
        break
      case "never":
        setExpiresAt(undefined)
        break
      case "custom":
        // Keep current date or set to tomorrow
        if (!expiresAt) {
          setExpiresAt(new Date(now.getTime() + 24 * 60 * 60 * 1000))
        }
        break
    }
  }

  const handleShare = async () => {
    setLoading(true)
    try {
      let result

      if (existingShare) {
        // Update existing share
        result = await updateSharedThread(existingShare.id, {
          title,
          description: description || undefined,
          is_public: isPublic,
          password: password || undefined,
          expires_at: expiresAt || null,
        })
        toast.success("Share settings updated!")
      } else {
        // Create new share
        result = await createSharedThread(
          threadId,
          title,
          description || undefined,
          isPublic,
          password || undefined,
          expiresAt,
        )
        toast.success("Conversation shared successfully!")
      }

      const newShareUrl = `${window.location.origin}/share/${result.share_token}`
      setShareUrl(newShareUrl)

      // Call the callback to update parent state
      onShareCreated?.(result)
    } catch (error) {
      console.error("Failed to share conversation:", error)
      toast.error("Failed to share conversation")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Share URL copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy URL")
    }
  }

  const resetForm = () => {
    setTitle(threadTitle)
    setDescription("")
    setIsPublic(true)
    setPassword("")
    setExpiresAt(undefined)
    setExpiryOption("never")
    setShareUrl("")
    setCopied(false)
  }

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes if no existing share
      if (!existingShare) {
        resetForm()
      }
    }
  }, [open, existingShare, threadTitle])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <Share2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-xl font-semibold">
              {existingShare ? "Update Share Settings" : "Share Conversation"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-base">
            {existingShare
              ? "Update the settings for your shared conversation."
              : "Create a shareable link for this conversation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* 🔖 Basic Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <span className="text-lg">🔖</span>
              <h3 className="text-base font-semibold text-foreground">Basic Info</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for the shared conversation"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description (optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description to help others understand the conversation"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* 🔒 Privacy & Protection Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <span className="text-lg">🔒</span>
              <h3 className="text-base font-semibold text-foreground">Privacy & Protection</h3>
            </div>

            <div className="space-y-6">
              {/* Public/Private Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background border border-border/50">
                    {isPublic ? (
                      <Globe className="h-4 w-4 text-green-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-semibold">{isPublic ? "Public" : "Private"}</span>
                    <p className="text-xs text-muted-foreground">
                      {isPublic
                        ? "Anyone with the link can view this conversation"
                        : "Only people with the link can view this conversation"}
                    </p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {/* Password Protection */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password Protection (optional)
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set a password to protect this share"
                    className="h-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-10 w-10 p-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {existingShare?.password_hash && !password && (
                  <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                    💡 Leave empty to keep current password, or enter new password to change it
                  </p>
                )}
              </div>

              {/* Expiry Settings */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Expiry Settings</Label>
                <Select value={expiryOption} onValueChange={handleExpiryOptionChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="1hour">1 hour</SelectItem>
                    <SelectItem value="1day">1 day</SelectItem>
                    <SelectItem value="1week">1 week</SelectItem>
                    <SelectItem value="1month">1 month</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>

                {expiryOption === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal",
                          !expiresAt && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiresAt ? format(expiresAt, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expiresAt}
                        onSelect={setExpiresAt}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>

          {/* 🔗 Share URL Section */}
          {shareUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <span className="text-lg">🔗</span>
                <h3 className="text-base font-semibold text-foreground">Share URL</h3>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm h-10 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={handleCopyUrl}
                  />
                  <Button
                    onClick={handleCopyUrl}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {existingShare && (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-border/50">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Eye className="h-4 w-4" />
                        <span className="font-semibold">{existingShare.view_count}</span>
                        <span className="text-muted-foreground">views</span>
                      </div>
                      {existingShare.expires_at && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-muted-foreground">
                            Expires {format(new Date(existingShare.expires_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 pt-6 border-t border-border/50">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-6">
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={loading || !title.trim()}
            className="px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                {existingShare ? "Updating..." : "Creating..."}
              </>
            ) : existingShare ? (
              "Update Share"
            ) : (
              "Create Share"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
