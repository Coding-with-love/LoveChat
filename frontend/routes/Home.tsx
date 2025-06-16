"use client"

import Chat from "@/frontend/components/Chat"
import { v4 as uuidv4 } from "uuid"
import { useAuth } from "@/frontend/components/AuthProvider"
import { useModelHydration } from "@/frontend/hooks/useModelHydration"

export default function Home() {
  const { user } = useAuth()

  // Initialize model preferences from database
  useModelHydration()

  // Show chat directly - API keys are handled by fallback system
  // Users can add their own keys in Settings if they want to override defaults
  return <Chat threadId={uuidv4()} initialMessages={[]} />
}
