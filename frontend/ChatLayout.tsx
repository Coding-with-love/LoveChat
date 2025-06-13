"use client"

import type React from "react"

import { SidebarProvider } from "@/frontend/components/ui/sidebar"
import { ChatSidebar } from "@/frontend/components/ChatSidebar"
import { Outlet, useParams } from "react-router"
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
  Bug,
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

export default function ChatLayout() {
  const { id } = useParams()
  const { isNavigatorVisible, handleToggleNavigator, closeNavigator, registerRef, scrollToMessage } = useChatNavigator()
  const { thread, updateTitle } = useThread(id)
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
  const titleInputRef = useRef<HTMLInputElement>(null)

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

  const handleDeleteChat = () => {
    // Implement delete functionality
    console.log("Delete chat:", id)
  }

  const handleDuplicateChat = () => {
    // Implement duplicate functionality
    console.log("Duplicate chat:", id)
  }

  const handleShareChat = () => {
    setShareDialogOpen(true)
  }

  const handleArchiveChat = () => {
    // Implement archive functionality
    console.log("Archive chat:", id)
  }

  const handleReportBug = () => {
    // Implement bug report functionality
    console.log("Report bug")
  }

  const handleSearchNavigation = (direction: "next" | "previous") => {
    const messageId = direction === "next" ? nextResult() : previousResult()
    if (messageId) {
      scrollToMessage(messageId)
    }
  }

  const handleSearchResultClick = (index: number) => {
    const messageId = navigateToResult(index)
    if (messageId) {
      scrollToMessage(messageId)
    }
  }

  return (
    <SidebarProvider>
      <div className="flex flex-1 relative">
        <ChatSidebar />
        <div className="flex-1 flex flex-col relative pl-2">
          {/* Sticky Header */}
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
              {/* Left side - Chat title */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={handleTitleKeyDown}
                    className="h-8 text-sm font-semibold bg-transparent border-dashed"
                    placeholder="Enter chat title..."
                  />
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h1
                      className="font-semibold truncate cursor-pointer hover:text-primary transition-colors"
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
                        className="h-6 w-6 opacity-60 hover:opacity-100"
                        aria-label="Edit chat title"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Right side - Chat controls */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <Button
                  onClick={toggleSearch}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Search in chat"
                >
                  <Search className="h-4 w-4" />
                </Button>

                {/* Export */}
                {id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Export conversation"
                        disabled={exporting}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport("markdown")}>Export as Markdown</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("txt")}>Export as Text</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("pdf")} disabled>
                        Export as PDF (Coming Soon)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Message Navigator */}
                <Button
                  onClick={handleToggleNavigator}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={isNavigatorVisible ? "Hide message navigator" : "Show message navigator"}
                >
                  <MessageSquareMore className="h-4 w-4" />
                </Button>

                {/* Pinned Messages */}
                {id && (
                  <Button
                    onClick={handleTogglePinnedMessages}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Show pinned messages"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}

                {/* Conversation Summary */}
                {id && (
                  <ConversationSummaryDialog
                    threadId={id}
                    trigger={
                      <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Summarize conversation">
                        <FileText className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}

                {/* Chat Actions Dropdown */}
                {id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8" aria-label="More actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDuplicateChat}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareChat}>
                        <Share className="h-4 w-4 mr-2" />
                        Share Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleArchiveChat}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Chat
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleReportBug}>
                        <Bug className="h-4 w-4 mr-2" />
                        Report Bug
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDeleteChat} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <ThemeToggler />
              </div>
            </div>

            {/* Search Bar */}
            {isSearchVisible && (
              <div className="border-t px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value, id)}
                      className="pl-10 pr-10"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {searchQuery && !isSearching && (
                      <Button
                        onClick={clearSearch}
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Search Navigation */}
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {currentResultIndex + 1} of {searchResults.length}
                      </span>
                      <Button
                        onClick={() => handleSearchNavigation("previous")}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={searchResults.length === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleSearchNavigation("next")}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={searchResults.length === 0}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-60 overflow-y-auto border rounded-md">
                    {searchResults.map((result, index) => (
                      <div
                        key={result.message.id}
                        className={`p-2 cursor-pointer hover:bg-accent ${
                          index === currentResultIndex ? "bg-accent" : ""
                        }`}
                        onClick={() => handleSearchResultClick(index)}
                      >
                        <div className="text-xs text-muted-foreground">
                          {new Date(result.message.created_at).toLocaleString()}
                        </div>
                        <div className="text-sm">{result.snippet}</div>
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
          />
        )}
      </div>
    </SidebarProvider>
  )
}
