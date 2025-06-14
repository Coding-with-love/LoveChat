"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/frontend/components/ui/dialog"
import { ScrollArea } from "@/frontend/components/ui/scroll-area"
import { useNavigate } from "react-router"
import { useSidebar } from "@/frontend/components/ui/sidebar"
import { useKeyboardShortcutManager, type ShortcutHandler } from "@/frontend/hooks/useKeyboardShortcutManager"
import { useMemo } from "react"

interface KeyboardShortcutsDialogProps {
  trigger: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function KeyboardShortcutsDialog({ trigger, open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const navigate = useNavigate()
  const { toggleSidebar } = useSidebar()

  const shortcuts = useMemo(() => [
    {
      name: "Navigation",
      shortcuts: [
        {
          key: "b",
          modifiers: { meta: true },
          description: "Toggle sidebar",
          handler: () => toggleSidebar()
        },
        {
          key: "k",
          modifiers: { meta: true },
          description: "Search conversations",
          handler: () => {/* TODO: Implement search */}
        },
        {
          key: "n",
          modifiers: { meta: true, shift: true },
          description: "New conversation",
          handler: () => navigate("/chat")
        }
      ]
    },
    {
      name: "Conversation",
      shortcuts: [
        {
          key: "Enter",
          description: "Send message",
          handler: () => {},
          allowInInput: true
        },
        {
          key: "Enter",
          modifiers: { meta: true },
          description: "New line",
          handler: () => {},
          allowInInput: true
        },
        {
          key: "Backspace",
          modifiers: { meta: true },
          description: "Clear input",
          handler: () => {}
        },
        {
          key: "z",
          modifiers: { meta: true },
          description: "Undo last message",
          handler: () => {}
        },
        {
          key: "Escape",
          description: "Stop generating",
          handler: () => {}
        }
      ]
    },
    {
      name: "Messages",
      shortcuts: [
        {
          key: "p",
          modifiers: { meta: true, shift: true },
          description: "Pin/unpin message",
          handler: () => {}
        },
        {
          key: "c",
          modifiers: { meta: true },
          description: "Copy message",
          handler: () => {}
        },
        {
          key: "e",
          modifiers: { meta: true },
          description: "Edit message",
          handler: () => {}
        }
      ]
    }
  ], [navigate, toggleSidebar])

  // Use the keyboard shortcut manager to get the current shortcuts
  const { shortcuts: activeShortcuts } = useKeyboardShortcutManager(shortcuts)

  // Helper function to format shortcut key display
  const formatShortcutKey = (shortcut: ShortcutHandler) => {
    const parts: string[] = []
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
    
    if (shortcut.modifiers?.meta) {
      parts.push(isMac ? "⌘" : "Win")
    }
    if (shortcut.modifiers?.shift) {
      parts.push(isMac ? "⇧" : "Shift")
    }
    if (shortcut.modifiers?.ctrl) {
      parts.push(isMac ? "⌃" : "Ctrl")
    }
    if (shortcut.modifiers?.alt) {
      parts.push(isMac ? "⌥" : "Alt")
    }
    
    let key = shortcut.key
    if (key === "Enter") {
      key = isMac ? "↵" : "Enter"
    } else if (key === "Backspace") {
      key = isMac ? "⌫" : "Backspace"
    } else if (key === "Escape") {
      key = "Esc"
    } else {
      key = key.toUpperCase()
    }
    
    parts.push(key)
    return parts.join(isMac ? " " : " + ")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Keyboard shortcuts to help you navigate and use LoveChat more efficiently.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {activeShortcuts.map((section) => (
              <div key={section.name}>
                <h4 className="mb-2 text-sm font-medium">{section.name}</h4>
                <div className="space-y-2">
                  {section.shortcuts.map((shortcut) => (
                    <div key={`${section.name}-${shortcut.description}`} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{shortcut.description}</span>
                      <kbd className="px-2 py-0.5 text-xs bg-muted rounded-md font-mono">
                        {formatShortcutKey(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 