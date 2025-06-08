"use client"

import { SidebarProvider } from "@/frontend/components/ui/sidebar"
import ChatSidebar from "@/frontend/components/ChatSidebar"
import { Outlet, useParams } from "react-router"
import { Button } from "@/frontend/components/ui/button"
import { MessageSquareMore } from 'lucide-react'
import ThemeToggler from "@/frontend/components/ui/ThemeToggler"
import { useChatNavigator } from "@/frontend/hooks/useChatNavigator"
import ChatNavigator from "@/frontend/components/ChatNavigator"

export default function ChatLayout() {
  const { id } = useParams()
  const { isNavigatorVisible, handleToggleNavigator, closeNavigator, registerRef, scrollToMessage } = useChatNavigator()

  return (
    <SidebarProvider>
      <ChatSidebar />
      <div className="flex-1 relative">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">LoveChat</h1>
            </div>

            {/* Chat controls on the right */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleToggleNavigator}
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={isNavigatorVisible ? "Hide message navigator" : "Show message navigator"}
              >
                <MessageSquareMore className="h-4 w-4" />
              </Button>

              <ThemeToggler />
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Chat Navigator */}
        {id && (
          <ChatNavigator
            threadId={id}
            scrollToMessage={scrollToMessage}
            isVisible={isNavigatorVisible}
            onClose={closeNavigator}
          />
        )}
      </div>
    </SidebarProvider>
  )
}
