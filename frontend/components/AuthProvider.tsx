"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import { getUserProfile } from "@/lib/supabase/queries"
import { useUserPreferencesStore } from "@/frontend/stores/UserPreferencesStore"

interface UserProfile {
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
  isAuthenticated: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Get the loadFromDatabase function from user preferences store
  const loadFromDatabase = useUserPreferencesStore((state) => state.loadFromDatabase)

  const loadProfile = useCallback(async (userId: string) => {
    try {
      let profile = await getUserProfile(userId)
      
      // If no profile exists or profile is missing data, check if we can populate from user metadata
      const { data: { user } } = await supabase.auth.getUser()
      if (user && (!profile || !profile.avatar_url) && user.user_metadata) {
        const updates: {
          username?: string
          full_name?: string
          avatar_url?: string
        } = {}
        
        // Populate from Google metadata if available
        if (!profile?.full_name && user.user_metadata.full_name) {
          updates.full_name = user.user_metadata.full_name
        }
        if (!profile?.avatar_url && (user.user_metadata.avatar_url || user.user_metadata.picture)) {
          updates.avatar_url = user.user_metadata.avatar_url || user.user_metadata.picture
        }
        
        // Update profile if we have any updates
        if (Object.keys(updates).length > 0) {
          try {
            const { updateUserProfile } = await import("@/lib/supabase/queries")
            const updatedProfile = await updateUserProfile(updates)
            setProfile(updatedProfile)
            return
          } catch (updateError) {
            console.error("Error updating profile:", updateError)
          }
        }
      }
      
      setProfile(profile)
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      console.log("🔄 Refreshing session...")
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        console.error("Failed to refresh session:", error)
        throw error
      }
      console.log("✅ Session refreshed successfully")
    } catch (error) {
      console.error("Error refreshing session:", error)
      throw error
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        // Load user preferences when user is authenticated
        loadFromDatabase().catch((error) => {
          console.error("Failed to load user preferences:", error)
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔐 Auth state changed:", event)
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user.id)
        // Load user preferences when user signs in
        try {
          await loadFromDatabase()
        } catch (error) {
          console.error("Failed to load user preferences:", error)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile, loadFromDatabase])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut, refreshSession, isAuthenticated: !!user }}>{children}</AuthContext.Provider>
}
