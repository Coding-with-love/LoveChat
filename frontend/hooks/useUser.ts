"use client"

import { useAuth } from "@/frontend/components/AuthProvider"

export const useUser = () => {
  const { user, profile, loading } = useAuth()
  
  return {
    user,
    profile,
    loading,
  }
} 