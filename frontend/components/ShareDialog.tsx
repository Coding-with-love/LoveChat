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
import { CalendarIcon, Copy, Check, Share2, Eye, Lock, Clock, Globe } from "lucide-react"
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
}

export default function ShareDialog({ open, onOpenChange, threadId, threadTitle, existingShare }: ShareDialogProps) {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {existingShare ? "Update Share Settings" : "Share Conversation"}
          </DialogTitle>
          <DialogDescription>
            {existingShare
              ? "Update the settings for your shared conversation."
              : "Create a shareable link for this conversation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for the shared conversation"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description to help others understand the conversation"
              rows={3}
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3">
            <Label>Privacy Settings</Label>

            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span className="text-sm font-medium">{isPublic ? "Public" : "Private"}</span>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <p className="text-xs text-muted-foreground">
              {isPublic
                ? "Anyone with the link can view this conversation"
                : "Only people with the link can view this conversation"}
            </p>

            {/* Password Protection */}
            <div className="space-y-2">
              <Label htmlFor="password">Password Protection (optional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a password to protect this share"
              />
              {existingShare?.password_hash && !password && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep current password, or enter new password to change it
                </p>
              )}
            </div>

            {/* Expiry Settings */}
            <div className="space-y-2">
              <Label>Expiry</Label>
              <Select value={expiryOption} onValueChange={handleExpiryOptionChange}>
                <SelectTrigger>
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
                        "w-full justify-start text-left font-normal",
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

          {/* Share URL (if exists) */}
          {shareUrl && (
            <div className="space-y-2">
              <Label>Share URL</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="font-mono text-sm" />
                <Button onClick={handleCopyUrl} variant="outline" size="icon" className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {existingShare && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {existingShare.view_count} views
                  </div>
                  {existingShare.expires_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires {format(new Date(existingShare.expires_at), "PPP")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading || !title.trim()}>
            {loading ? "Sharing..." : existingShare ? "Update Share" : "Create Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
