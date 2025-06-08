"use client"

import dynamic from "next/dynamic"
import { AuthProvider } from "@/frontend/components/AuthProvider"

const App = dynamic(() => import("@/frontend/app"), { ssr: false })

export default function Home() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}
