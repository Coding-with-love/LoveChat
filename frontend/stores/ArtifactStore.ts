import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "@/lib/supabase/client"

export interface Artifact {
  id: string
  user_id: string
  thread_id?: string
  message_id?: string
  title: string
  description?: string
  content: string
  content_type: string
  language?: string
  file_extension?: string
  tags: string[]
  metadata: Record<string, any>
  is_pinned: boolean
  is_archived: boolean
  version: number
  project_name?: string
  created_at: string
  updated_at: string
}

export interface ArtifactVersion {
  id: string
  artifact_id: string
  version: number
  content: string
  metadata: Record<string, any>
  created_at: string
  created_by: string
}

interface ArtifactStore {
  artifacts: Artifact[]
  selectedArtifact: Artifact | null
  artifactVersions: Record<string, ArtifactVersion[]>
  isLoading: boolean
  error: string | null

  // Actions
  fetchArtifacts: (filters?: ArtifactFilters) => Promise<void>
  createArtifact: (data: CreateArtifactData) => Promise<Artifact | null>
  updateArtifact: (id: string, updates: Partial<Artifact>) => Promise<void>
  deleteArtifact: (id: string) => Promise<void>
  selectArtifact: (artifact: Artifact | null) => void
  pinArtifact: (id: string) => Promise<void>
  archiveArtifact: (id: string) => Promise<void>
  downloadArtifact: (id: string) => Promise<void>

  // Version history methods
  fetchArtifactVersions: (artifactId: string) => Promise<ArtifactVersion[]>
  createArtifactVersion: (artifactId: string, content: string, changeDescription?: string, metadata?: Record<string, any>) => Promise<void>
  restoreArtifactVersion: (artifactId: string, versionId: string) => Promise<void>
  downloadArtifactVersion: (artifactId: string, versionId: string) => Promise<void>

  // Enhanced Utility Methods
  getArtifactsByThread: (threadId: string) => Artifact[]
  getArtifactsByMessageId: (messageId: string) => Artifact[]
  getPinnedArtifacts: () => Artifact[]
  searchArtifacts: (query: string) => Artifact[]
  getArtifactById: (id: string) => Artifact | undefined
  getRecentArtifacts: (limit?: number) => Artifact[]
  getArtifactsByContentType: (contentType: string) => Artifact[]

  // Real-time updates
  addArtifact: (artifact: Artifact) => void
  removeArtifact: (id: string) => void
  updateArtifactInStore: (id: string, updates: Partial<Artifact>) => void

  // Enhanced search that works better for cross-chat references
  searchArtifactsByTitle: (title: string) => Artifact[]
  
  // Check if specific code content has an associated artifact
  getArtifactByContent: (content: string, messageId?: string) => Artifact | undefined
}

export interface ArtifactFilters {
  threadId?: string
  messageId?: string
  search?: string
  contentType?: string
  tags?: string[]
  pinned?: boolean
  archived?: boolean
}

export interface CreateArtifactData {
  title: string
  description?: string
  content: string
  content_type?: string
  language?: string
  file_extension?: string
  tags?: string[]
  metadata?: Record<string, any>
  thread_id?: string
  message_id?: string
  project_name?: string
}

const API_BASE = "/api/artifacts"

// Helper function to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    throw new Error("Authentication required")
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}

export const useArtifactStore = create<ArtifactStore>()(
  persist(
    (set, get) => ({
      artifacts: [],
      selectedArtifact: null,
      artifactVersions: {},
      isLoading: false,
      error: null,

      fetchArtifacts: async (filters = {}) => {
        set({ isLoading: true, error: null })

        try {
          const params = new URLSearchParams()
          if (filters.threadId) params.append("threadId", filters.threadId)
          if (filters.messageId) params.append("messageId", filters.messageId)
          if (filters.search) params.append("search", filters.search)
          if (filters.contentType) params.append("contentType", filters.contentType)
          if (filters.tags?.length) params.append("tags", filters.tags.join(","))
          if (filters.pinned !== undefined) params.append("pinned", filters.pinned.toString())
          if (filters.archived !== undefined) params.append("archived", filters.archived.toString())

          const headers = await getAuthHeaders()
          const response = await fetch(`${API_BASE}?${params}`, {
            headers,
          })

          if (!response.ok) {
            throw new Error("Failed to fetch artifacts")
          }

          const { artifacts } = await response.json()
          set({ artifacts, isLoading: false })
        } catch (error) {
          console.error("Error fetching artifacts:", error)
          set({ error: (error as Error).message, isLoading: false })
        }
      },

      createArtifact: async (data) => {
        set({ isLoading: true, error: null })

        try {
          const headers = await getAuthHeaders()
          const response = await fetch(API_BASE, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
          })

          if (!response.ok) {
            throw new Error("Failed to create artifact")
          }

          const { artifact } = await response.json()
          set((state) => ({
            artifacts: [artifact, ...state.artifacts],
            isLoading: false,
          }))

          return artifact
        } catch (error) {
          console.error("Error creating artifact:", error)
          set({ error: (error as Error).message, isLoading: false })
          return null
        }
      },

      updateArtifact: async (id, updates) => {
        set({ isLoading: true, error: null })

        try {
          const headers = await getAuthHeaders()
          const response = await fetch(`${API_BASE}/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(updates),
          })

          if (!response.ok) {
            throw new Error("Failed to update artifact")
          }

          const { artifact } = await response.json()
          set((state) => ({
            artifacts: state.artifacts.map((a) => (a.id === id ? artifact : a)),
            selectedArtifact: state.selectedArtifact?.id === id ? artifact : state.selectedArtifact,
            isLoading: false,
          }))
        } catch (error) {
          console.error("Error updating artifact:", error)
          set({ error: (error as Error).message, isLoading: false })
        }
      },

      deleteArtifact: async (id) => {
        set({ isLoading: true, error: null })

        try {
          const headers = await getAuthHeaders()
          const response = await fetch(`${API_BASE}/${id}`, {
            method: "DELETE",
            headers,
          })

          if (!response.ok) {
            throw new Error("Failed to delete artifact")
          }

          set((state) => ({
            artifacts: state.artifacts.filter((a) => a.id !== id),
            selectedArtifact: state.selectedArtifact?.id === id ? null : state.selectedArtifact,
            isLoading: false,
          }))
        } catch (error) {
          console.error("Error deleting artifact:", error)
          set({ error: (error as Error).message, isLoading: false })
        }
      },

      selectArtifact: (artifact) => {
        set({ selectedArtifact: artifact })
      },

      pinArtifact: async (id) => {
        const artifact = get().artifacts.find((a) => a.id === id)
        if (artifact) {
          await get().updateArtifact(id, { is_pinned: !artifact.is_pinned })
        }
      },

      archiveArtifact: async (id) => {
        const artifact = get().artifacts.find((a) => a.id === id)
        if (artifact) {
          await get().updateArtifact(id, { is_archived: !artifact.is_archived })
        }
      },

      downloadArtifact: async (id) => {
        try {
          const headers = await getAuthHeaders()
          const response = await fetch(`${API_BASE}/${id}/download`, {
            headers,
          })

          if (!response.ok) {
            throw new Error("Failed to download artifact")
          }

          const blob = await response.blob()
          const artifact = get().artifacts.find((a) => a.id === id)
          const filename = artifact?.file_extension
            ? `${artifact.title}.${artifact.file_extension}`
            : `${artifact?.title || "artifact"}.txt`

          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } catch (error) {
          console.error("Error downloading artifact:", error)
          set({ error: (error as Error).message })
        }
      },

      // Version history methods
      fetchArtifactVersions: async (artifactId) => {
        try {
          const headers = await getAuthHeaders()
          const response = await fetch(`${API_BASE}/${artifactId}/versions`, {
            headers,
          })

          if (!response.ok) {
            throw new Error("Failed to fetch artifact versions")
          }

          const { versions } = await response.json()
          set((state) => ({
            artifactVersions: {
              ...state.artifactVersions,
              [artifactId]: versions,
            },
            isLoading: false,
          }))

          return versions
        } catch (error) {
          console.error("Error fetching artifact versions:", error)
          set({ error: (error as Error).message, isLoading: false })
          return []
        }
      },

      createArtifactVersion: async (artifactId, content, changeDescription, metadata) => {
        try {
          const headers = await getAuthHeaders()
          const response = await fetch(`${API_BASE}/${artifactId}/versions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ content, changeDescription, metadata }),
          })

          if (!response.ok) {
            throw new Error("Failed to create artifact version")
          }

          const version = await response.json()
          set((state) => ({
            artifactVersions: {
              ...state.artifactVersions,
              [artifactId]: [...state.artifactVersions[artifactId], version],
            },
            isLoading: false,
          }))
        } catch (error) {
          console.error("Error creating artifact version:", error)
          set({ error: (error as Error).message, isLoading: false })
        }
      },

      restoreArtifactVersion: async (artifactId, versionId) => {
        try {
          const headers = await getAuthHeaders()
          const response = await fetch(`${API_BASE}/${artifactId}/versions/${versionId}/restore`, {
            method: "PUT",
            headers,
          })

          if (!response.ok) {
            throw new Error("Failed to restore artifact version")
          }

          const artifact = await response.json()
          set((state) => ({
            artifacts: state.artifacts.map((a) => (a.id === artifact.id ? artifact : a)),
            selectedArtifact: state.selectedArtifact?.id === artifact.id ? artifact : state.selectedArtifact,
            isLoading: false,
          }))
        } catch (error) {
          console.error("Error restoring artifact version:", error)
          set({ error: (error as Error).message, isLoading: false })
        }
      },

             downloadArtifactVersion: async (artifactId, versionId) => {
         try {
           const headers = await getAuthHeaders()
           const response = await fetch(`${API_BASE}/${artifactId}/versions/${versionId}/download`, {
             headers,
           })

           if (!response.ok) {
             throw new Error("Failed to download artifact version")
           }

           const blob = await response.blob()
           const artifact = get().artifacts.find((a) => a.id === artifactId)
           const version = get().artifactVersions[artifactId]?.find((v) => v.id === versionId)
           const filename = artifact?.file_extension
             ? `${artifact.title}_v${version?.version || 'unknown'}.${artifact.file_extension}`
             : `${artifact?.title || "artifact"}_v${version?.version || 'unknown'}.txt`

           const url = window.URL.createObjectURL(blob)
           const a = document.createElement("a")
           a.href = url
           a.download = filename
           document.body.appendChild(a)
           a.click()
           window.URL.revokeObjectURL(url)
           document.body.removeChild(a)
         } catch (error) {
           console.error("Error downloading artifact version:", error)
           set({ error: (error as Error).message })
         }
       },

      // Enhanced utility methods
      getArtifactsByThread: (threadId) => {
        return get().artifacts.filter((a) => a.thread_id === threadId && !a.is_archived)
      },

      getArtifactsByMessageId: (messageId) => {
        return get().artifacts.filter((a) => a.message_id === messageId && !a.is_archived)
      },

      getPinnedArtifacts: () => {
        return get().artifacts.filter((a) => a.is_pinned && !a.is_archived)
      },

      searchArtifacts: (query) => {
        const lowerQuery = query.toLowerCase()
        return get().artifacts.filter(
          (a) =>
            !a.is_archived &&
            (a.title.toLowerCase().includes(lowerQuery) ||
              a.description?.toLowerCase().includes(lowerQuery) ||
              a.content.toLowerCase().includes(lowerQuery) ||
              a.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))),
        )
      },

      // Enhanced search that works better for cross-chat references
      searchArtifactsByTitle: (title: string) => {
        const lowerTitle = title.toLowerCase().trim()
        return get()
          .artifacts.filter(
            (a) =>
              !a.is_archived &&
              (a.title.toLowerCase() === lowerTitle ||
                a.title.toLowerCase().includes(lowerTitle) ||
                lowerTitle.includes(a.title.toLowerCase())),
          )
          .sort((a, b) => {
            // Exact matches first
            if (a.title.toLowerCase() === lowerTitle) return -1
            if (b.title.toLowerCase() === lowerTitle) return 1
            // Then by creation date (newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
      },

      // Check if specific code content has an associated artifact
      getArtifactByContent: (content: string, messageId?: string) => {
        const trimmedContent = content.trim()
        const artifacts = get().artifacts.filter(a => !a.is_archived)
        
        console.log('🔍 Checking for artifact with content:', {
          contentLength: trimmedContent.length,
          messageId,
          availableArtifacts: artifacts.filter(a => a.message_id === messageId).length,
          totalArtifacts: artifacts.length
        })
        
        // First try to find exact content match in the same message
        if (messageId) {
          const messageArtifact = artifacts.find(a => 
            a.message_id === messageId && 
            a.content.trim() === trimmedContent
          )
          if (messageArtifact) {
            console.log('✅ Found exact match in same message:', messageArtifact.title)
            return messageArtifact
          }
        }
        
        // Then try to find exact content match anywhere
        const exactMatch = artifacts.find(a => 
          a.content.trim() === trimmedContent
        )
        if (exactMatch) {
          console.log('✅ Found exact content match:', exactMatch.title)
          return exactMatch
        }
        
        // Finally try to find if the code is contained within an artifact (for partial matches)
        const partialMatch = artifacts.find(a => 
          a.content_type === 'code' && 
          (a.content.includes(trimmedContent) || trimmedContent.includes(a.content.trim()))
        )
        
        if (partialMatch) {
          console.log('✅ Found partial match:', partialMatch.title)
        } else {
          console.log('❌ No artifact found for content')
        }
        
        return partialMatch
      },

      getArtifactById: (id) => {
        return get().artifacts.find((a) => a.id === id)
      },

      getRecentArtifacts: (limit = 10) => {
        return get()
          .artifacts.filter((a) => !a.is_archived)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit)
      },

      getArtifactsByContentType: (contentType) => {
        return get().artifacts.filter((a) => a.content_type === contentType && !a.is_archived)
      },

      // Real-time update methods
      addArtifact: (artifact) => {
        set((state) => ({
          artifacts: [artifact, ...state.artifacts],
        }))
      },

      removeArtifact: (id) => {
        set((state) => ({
          artifacts: state.artifacts.filter((a) => a.id !== id),
          selectedArtifact: state.selectedArtifact?.id === id ? null : state.selectedArtifact,
        }))
      },

      updateArtifactInStore: (id, updates) => {
        set((state) => ({
          artifacts: state.artifacts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
          selectedArtifact:
            state.selectedArtifact?.id === id ? { ...state.selectedArtifact, ...updates } : state.selectedArtifact,
        }))
      },
    }),
    {
      name: "artifact-store",
      partialize: (state) => ({
        selectedArtifact: state.selectedArtifact,
        // Don't persist artifacts array to avoid stale data
      }),
    },
  ),
)
