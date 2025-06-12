"use client"
import { BrowserRouter, Route, Routes } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { useAuth } from "@/frontend/components/AuthProvider"
import AuthForm from "@/frontend/components/AuthForm"
import ChatLayout from "./ChatLayout"
import Home from "./routes/Home"
import Index from "./routes/Index"
import Thread from "./routes/Thread"
import Settings from "./routes/Settings"
import SharedConversation from "./routes/SharedConversation"
import Project from "./routes/Project"
import { Toaster } from "sonner"
import { GlobalResumingIndicator } from "./components/ResumingIndicator"
import ThemeProvider from "./components/ThemeProvider"
import GlobalLanguageDialog from "./components/GlobalLanguageDialog"

function AuthenticatedApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="chat" element={<ChatLayout />}>
          <Route index element={<Home />} />
          <Route path=":id" element={<Thread />} />
        </Route>
        <Route path="project/:projectId" element={<Project />} />
        <Route path="settings" element={<Settings />} />
        <Route path="share/:token" element={<SharedConversation />} />
        <Route path="*" element={<p>Not found</p>} />
      </Routes>
    </BrowserRouter>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  )
}

function AuthScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <AuthForm />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  // Wrap everything in ThemeProvider to ensure themes work regardless of auth state
  return (
    <ThemeProvider>
      {loading ? (
        <LoadingSpinner />
      ) : !user ? (
        <AuthScreen />
      ) : (
        <QueryClientProvider client={queryClient}>
          <AuthenticatedApp />
          <GlobalResumingIndicator />
          <Toaster position="top-right" />
        </QueryClientProvider>
      )}
      {/* Add GlobalLanguageDialog outside of auth check so it's always available */}
      <GlobalLanguageDialog />
    </ThemeProvider>
  )
}
