"use client"

import type React from "react"

import { SidebarProvider } from "@/frontend/components/ui/sidebar"
import { ChatSidebar } from "@/frontend/components/ChatSidebar"
import { Outlet, useParams, useNavigate } from "react-router"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu"
import {
  FileText,
  MessageSquareMore,
  Star,
  Search,
  Download,
  Edit2,
  MoreVertical,
  Trash2,
  Copy,
  Share,
  Archive,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react"
import ThemeToggler from "@/frontend/components/ui/ThemeToggler"
import { useChatNavigator } from "@/frontend/hooks/useChatNavigator"
import { useThread } from "@/frontend/hooks/useThread"
import { useConversationExport, type ExportFormat } from "@/frontend/hooks/useConversationExport"
import { useChatSearch } from "@/frontend/hooks/useChatSearch"
import ChatNavigator from "@/frontend/components/ChatNavigator"
import PinnedMessages from "@/frontend/components/PinnedMessages"
import ShareDialog from "@/frontend/components/ShareDialog"
import { useState, useRef, useEffect } from "react"
import { ConversationSummaryDialog } from "@/frontend/components/ConversationSummaryDialog"
import { deleteThread, toggleThreadArchived } from "@/lib/supabase/queries"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/frontend/components/ui/dialog"
import { createThread, getMessagesByThreadId, createMessage, getSharedThreadByThreadId } from "@/lib/supabase/queries"
import { v4 as uuidv4 } from "uuid"

export default function ChatLayout() {
  const { id } = useParams()
  const { isNavigatorVisible, handleToggleNavigator, closeNavigator, registerRef, scrollToMessage } = useChatNavigator()
  const { thread, updateTitle } = useThread(id || null)
  const { exportConversation, exporting } = useConversationExport()
  const {
    searchQuery,
    isSearchVisible,
    searchResults,
    isSearching,
    currentResultIndex,
    toggleSearch,
    handleSearch,
    clearSearch,
    navigateToResult,
    nextResult,
    previousResult,
  } = useChatSearch()

  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [existingShare, setExistingShare] = useState<any>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const navigate = useNavigate()

  // Ref to store the sidebar refresh function
  const sidebarRefreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  // Handle search input changes
  useEffect(() => {
    if (id && searchQuery) {
      handleSearch(searchQuery, id)
    }
  }, [searchQuery, id, handleSearch])

  const handleTogglePinnedMessages = () => {
    setShowPinnedMessages(!showPinnedMessages)
  }

  const handleClosePinnedMessages = () => {
    setShowPinnedMessages(false)
  }

  const handleTitleDoubleClick = () => {
    if (thread) {
      setEditTitle(thread.title)
      setIsEditingTitle(true)
    }
  }

  const handleTitleEdit = () => {
    if (thread) {
      setEditTitle(thread.title)
      setIsEditingTitle(true)
    }
  }

  const handleTitleSave = async () => {
    if (editTitle.trim() && thread) {
      const success = await updateTitle(editTitle.trim())
      if (success) {
        setIsEditingTitle(false)
      }
    }
  }

  const handleTitleCancel = () => {
    setIsEditingTitle(false)
    setEditTitle("")
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave()
    } else if (e.key === "Escape") {
      handleTitleCancel()
    }
  }

  const handleExport = async (format: ExportFormat) => {
    if (id) {
      await exportConversation(id, format)
    }
  }

  const handleDeleteChat = async () => {
    if (!id) return

    setIsDeleteDialogOpen(true)
  }

  const handleDuplicateChat = async () => {
    if (!id || !thread) return

    try {
      // Create a new thread with a similar title
      const newThreadId = uuidv4()
      const newTitle = `${thread.title} (Copy)`
      await createThread(newThreadId)

      // Update the title
      await updateTitle(newTitle, newThreadId)

      // Get all messages from the current thread
      const messages = await getMessagesByThreadId(id)

      // Copy all messages to the new thread
      for (const message of messages) {
        await createMessage(newThreadId, {
          id: uuidv4(),
          role: message.role,
          content: message.content,
          parts: message.parts,
          createdAt: new Date(),
        })
      }

      toast.success("Chat duplicated successfully")

      // Refresh the sidebar to show the new thread immediately
      sidebarRefreshRef.current()

      navigate(`/chat/${newThreadId}`) // Navigate to the new thread
    } catch (error) {
      console.error("Error duplicating chat:", error)
      toast.error("Failed to duplicate chat")
    }
  }

  const handleShareChat = async () => {
    if (!id) return

    try {
      // Check if there's already a share for this thread
      const share = await getSharedThreadByThreadId(id)
      setExistingShare(share)
    } catch (error) {
      console.error("Failed to check for existing share:", error)
      setExistingShare(null)
    }

    setShareDialogOpen(true)
  }

  const handleArchiveChat = async () => {
    if (!id || !thread) return

    try {
      // Get the current archived status from the database field, not the title
      const isCurrentlyArchived = thread.is_archived || false

      // Update the database
      await toggleThreadArchived(id, !isCurrentlyArchived)

      toast.success(isCurrentlyArchived ? "Chat unarchived" : "Chat archived")

      console.log(`✅ Chat ${id} ${!isCurrentlyArchived ? "archived" : "unarchived"} from ChatLayout`)
    } catch (error) {
      console.error("Error archiving chat:", error)
      toast.error("Failed to update archive status")
    }
  }

  const handleSearchNavigation = (direction: "next" | "previous") => {
    const messageId = direction === "next" ? nextResult() : previousResult()
    if (messageId) {
      // Small delay to allow UI updates before scrolling
      setTimeout(() => {
        scrollToMessage(messageId)
      }, 100)
    }
  }

  const handleSearchResultClick = (index: number) => {
    const messageId = navigateToResult(index)
    if (messageId) {
      // Small delay to allow UI updates before scrolling
      setTimeout(() => {
        scrollToMessage(messageId)
      }, 150)
    }
  }

  const confirmDelete = async () => {
    if (!id) return

    try {
      await deleteThread(id)
      toast.success("Chat deleted successfully")
      setIsDeleteDialogOpen(false)

      // Refresh the sidebar to remove the deleted thread immediately
      sidebarRefreshRef.current()

      navigate("/chat") // Navigate to chat home after deletion
    } catch (error) {
      console.error("Error deleting chat:", error)
      toast.error("Failed to delete chat")
    }
  }

  return (
    <SidebarProvider>
      <div className="flex flex-1 relative h-svh overflow-hidden">
        <ChatSidebar onRefreshData={sidebarRefreshRef} />
        <div className="flex-1 flex flex-col relative pl-2">
          {/* Sticky Header */}
          <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
            <div className="flex h-16 items-center justify-between px-6">
              {/* Left side - Chat title */}
              <div className="flex items-center gap-3 flex-1 min-w-0 group">
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={handleTitleKeyDown}
                    className="h-9 text-base font-semibold bg-transparent border-dashed"
                    placeholder="Enter chat title..."
                  />
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h1
                      className="text-lg font-bold truncate cursor-pointer hover:text-primary transition-colors leading-tight"
                      onDoubleClick={handleTitleDoubleClick}
                      title={thread?.title || "LoveChat"}
                    >
                      {thread?.title || "LoveChat"}
                    </h1>
                    {thread && (
                      <Button
                        onClick={handleTitleEdit}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10 rounded-lg"
                        aria-label="Rename chat"
                        title="Rename chat"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Right side - Chat controls */}
              <div className="flex items-center">
                {/* Search & Export Group */}
                <div className="flex items-center gap-1 mr-4">
                  {/* Search - only show when there's an active chat */}
                  {id && (
                    <Button
                      onClick={toggleSearch}
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 hover:shadow-md hover:scale-105 transition-all duration-200 rounded-lg"
                      aria-label="Search in chat"
                      title="Search"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Export */}
                  {id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 hover:shadow-md hover:scale-105 transition-all duration-200 rounded-lg"
                          aria-label="Export conversation"
                          title="Export"
                          disabled={exporting}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport("markdown")}>Export as Markdown</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport("txt")}>Export as Text</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport("pdf")}>Export as PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Navigation & Features Group */}
                <div className="flex items-center gap-1 mr-4">
                  {/* Message Navigator - only show when there's an active chat */}
                  {id && (
                    <Button
                      onClick={handleToggleNavigator}
                      variant="outline"
                      size="icon"
                      className={`h-9 w-9 hover:shadow-md hover:scale-105 transition-all duration-200 rounded-lg ${
                        isNavigatorVisible ? "bg-primary/10 border-primary/30" : ""
                      }`}
                      aria-label={isNavigatorVisible ? "Hide message navigator" : "Show message navigator"}
                      title="Message Navigator"
                    >
                      <MessageSquareMore className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Pinned Messages */}
                  {id && (
                    <Button
                      onClick={handleTogglePinnedMessages}
                      variant="outline"
                      size="icon"
                      className={`h-9 w-9 hover:shadow-md hover:scale-105 transition-all duration-200 rounded-lg ${
                        showPinnedMessages ? "bg-yellow-50 border-yellow-200 text-yellow-600" : ""
                      }`}
                      aria-label="Show pinned messages"
                      title="Pinned Messages"
                    >
                      <Star className={`h-4 w-4 ${showPinnedMessages ? "fill-current" : ""}`} />
                    </Button>
                  )}

                  {/* Conversation Summary */}
                  {id && (
                    <ConversationSummaryDialog
                      threadId={id}
                      trigger={
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 hover:shadow-md hover:scale-105 transition-all duration-200 rounded-lg"
                          aria-label="Summarize conversation"
                          title="Summarize"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      }
                    />
                  )}
                </div>

                {/* Actions & Settings Group */}
                <div className="flex items-center gap-1">
                  {/* Chat Actions Dropdown */}
                  {id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 hover:shadow-md hover:scale-105 transition-all duration-200 rounded-lg"
                          aria-label="More actions"
                          title="More Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleDuplicateChat} className="gap-2">
                          <Copy className="h-4 w-4 text-green-500" />
                          Duplicate Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShareChat} className="gap-2">
                          <Share className="h-4 w-4 text-blue-500" />
                          Share Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleArchiveChat} className="gap-2">
                          <Archive className="h-4 w-4 text-gray-500" />
                          Archive Chat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDeleteChat} className="text-destructive gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <div className="ml-2">
                    <ThemeToggler />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            {isSearchVisible && (
              <div className="border-t border-border/10 bg-muted/30 px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value, id)}
                      className="pl-10 pr-10 h-10 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {searchQuery && !isSearching && (
                      <Button
                        onClick={clearSearch}
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 hover:bg-destructive/10 hover:text-destructive rounded-md"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Search Navigation */}
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-2 bg-background/80 rounded-lg px-3 py-1.5 border border-border/50">
                      <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
                        {currentResultIndex + 1} of {searchResults.length}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleSearchNavigation("previous")}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-primary/10 rounded-md"
                          disabled={searchResults.length === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleSearchNavigation("next")}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-primary/10 rounded-md"
                          disabled={searchResults.length === 0}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-3 max-h-60 overflow-y-auto border rounded-lg bg-background/80 backdrop-blur-sm">
                    {searchResults.map((result, index) => (
                      <div
                        key={result.message.id}
                        className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/10 last:border-b-0 ${
                          index === currentResultIndex ? "bg-accent/80" : ""
                        }`}
                        onClick={() => handleSearchResultClick(index)}
                      >
                        <div className="text-xs text-muted-foreground font-medium mb-1">
                          {new Date(result.message.created_at).toLocaleString()}
                        </div>
                        <div className="text-sm leading-relaxed">{result.snippet}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden relative">
            <Outlet />
          </main>
        </div>

        {/* Message Navigator */}
        {isNavigatorVisible && id && (
          <ChatNavigator
            threadId={id}
            scrollToMessage={scrollToMessage}
            isVisible={isNavigatorVisible}
            onClose={closeNavigator}
          />
        )}

        {/* Pinned Messages */}
        {showPinnedMessages && id && <PinnedMessages threadId={id} onClose={handleClosePinnedMessages} />}

        {/* Share Dialog */}
        {id && (
          <ShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            threadId={id}
            threadTitle={thread?.title || "Chat"}
            existingShare={existingShare}
            onShareCreated={(share) => setExistingShare(share)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Chat</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this chat? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  )
}
