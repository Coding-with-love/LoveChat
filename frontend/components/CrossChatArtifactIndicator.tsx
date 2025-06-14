"use client"

import { useState, useEffect } from "react"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import { Badge } from "@/frontend/components/ui/badge"
import { Button } from "@/frontend/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/frontend/components/ui/popover"
import { Archive, Info, TrendingUp, Clock, Pin } from 'lucide-react'
import { cn } from "@/lib/utils"

interface CrossChatArtifactIndicatorProps {
  currentThreadId: string
  className?: string
}

export function CrossChatArtifactIndicator({ currentThreadId, className }: CrossChatArtifactIndicatorProps) {
  const { artifacts } = useArtifactStore()
  const [crossChatStats, setCrossChatStats] = useState({
    totalArtifacts: 0,
    crossChatArtifacts: 0,
    pinnedCrossChatArtifacts: 0,
    recentCrossChatArtifacts: 0
  })

  useEffect(() => {
    const currentThreadArtifacts = artifacts.filter(a => a.thread_id === currentThreadId && !a.is_archived)
    const crossChatArtifacts = artifacts.filter(a => a.thread_id !== currentThreadId && !a.is_archived)
    const pinnedCrossChatArtifacts = crossChatArtifacts.filter(a => a.is_pinned)
    
    // Recent = created in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentCrossChatArtifacts = crossChatArtifacts.filter(a => 
      new Date(a.created_at) > sevenDaysAgo
    )

    setCrossChatStats({
      totalArtifacts: artifacts.filter(a => !a.is_archived).length,
      crossChatArtifacts: crossChatArtifacts.length,
      pinnedCrossChatArtifacts: pinnedCrossChatArtifacts.length,
      recentCrossChatArtifacts: recentCrossChatArtifacts.length
    })
  }, [artifacts, currentThreadId])

  if (crossChatStats.crossChatArtifacts === 0) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-7 px-2 text-xs text-muted-foreground hover:text-foreground",
            "border border-accent bg-accent/20 hover:bg-accent/30",
            "dark:border-accent dark:bg-accent/10 dark:hover:bg-accent/20",
            className
          )}
        >
          <Archive className="h-3 w-3 mr-1" />
          {crossChatStats.crossChatArtifacts} Cross-Chat
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-primary" />
            <h3 className="font-medium">Cross-Chat Artifacts</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            You can reference artifacts from any of your conversations. Here's what's available:
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Archive className="h-3 w-3" />
                Total Available
              </span>
              <Badge variant="secondary">{crossChatStats.crossChatArtifacts}</Badge>
            </div>
            
            {crossChatStats.pinnedCrossChatArtifacts > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
                <Badge variant="secondary">{crossChatStats.pinnedCrossChatArtifacts}</Badge>
              </div>
            )}
            
            {crossChatStats.recentCrossChatArtifacts > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Recent (7 days)
                </span>
                <Badge variant="secondary">{crossChatStats.recentCrossChatArtifacts}</Badge>
              </div>
            )}
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">How to use:</p>
                <ul className="space-y-1">
                  <li>• Click the <Archive className="h-3 w-3 inline" /> button to browse artifacts</li>
                  <li>• "Reference" adds a link to the artifact</li>
                  <li>• Cross-chat artifacts show an <Archive className="h-3 w-3 inline text-primary" /> icon</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 