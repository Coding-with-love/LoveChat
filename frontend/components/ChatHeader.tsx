"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Pin, GraduationCap } from 'lucide-react'
import { SidebarTrigger, useSidebar } from "./ui/sidebar"
import PinnedMessages from "./PinnedMessages"
import { useStudyModeStore } from "@/frontend/stores/StudyModeStore"

interface ChatHeaderProps {
  threadId: string
}

export function ChatHeader({ threadId }: ChatHeaderProps) {
  const { state } = useSidebar()
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const studyModeEnabled = useStudyModeStore((state) => state.enabled)
  const toggleStudyMode = useStudyModeStore((state) => state.toggle)

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/40">
      <div className="flex items-center justify-between h-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center">
          <SidebarTrigger className={`${state === "expanded" ? "md:hidden" : ""}`} />
          <h1 className="text-lg font-medium ml-4">Chat</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleStudyMode}
            variant={studyModeEnabled ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1"
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Study</span>
          </Button>
          <Button
            onClick={() => setShowPinnedMessages(!showPinnedMessages)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <Pin className="h-4 w-4" />
            <span className="hidden sm:inline">Pinned</span>
          </Button>
        </div>

        {/* Pinned Messages Panel */}
        {showPinnedMessages && (
          <div className="fixed top-16 right-4 z-40 w-80 max-h-[80vh] bg-background border rounded-lg shadow-lg">
            <PinnedMessages threadId={threadId} onClose={() => setShowPinnedMessages(false)} />
          </div>
        )}
      </div>
    </div>
  )
}
