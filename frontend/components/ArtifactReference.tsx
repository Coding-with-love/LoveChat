"use client"

import React, { useState, useEffect } from "react"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import type { Artifact } from "@/frontend/stores/ArtifactStore"

interface ArtifactReferenceProps {
  artifactId: string
  children?: React.ReactNode
}

const ArtifactReference: React.FC<ArtifactReferenceProps> = ({ artifactId, children }) => {
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const { fetchArtifacts, searchArtifacts } = useArtifactStore()

  useEffect(() => {
    const loadArtifact = async () => {
      setLoading(true)
      setError(null)

      try {
        // Handle different artifact ID formats
        if (artifactId.startsWith("id:")) {
          // Explicit ID format: "id:uuid"
          const id = artifactId.replace("id:", "")
          const artifact = useArtifactStore.getState().artifacts.find((a) => a.id === id)

          if (artifact) {
            setArtifact(artifact)
          } else {
            await fetchArtifacts()
            const artifact = useArtifactStore.getState().artifacts.find((a) => a.id === id)

            if (artifact) {
              setArtifact(artifact)
            } else {
              setError(`Artifact with id "${id}" not found`)
            }
          }
        } else if (artifactId.startsWith("title:")) {
          // Title-based lookup: "title:artifact name"
          const title = artifactId.replace("title:", "")

          // First try local search
          const localResults = searchArtifacts(title)
          if (localResults.length > 0) {
            setArtifact(localResults[0])
          } else {
            // Fetch from API and try again
            await fetchArtifacts({ search: title })
            const apiResults = searchArtifacts(title)

            if (apiResults.length > 0) {
              setArtifact(apiResults[0])
            } else {
              setError(`Artifact "${title}" not found`)
            }
          }
        } else if (artifactId.match(/^[a-f0-9-]{36}$/)) {
          // Raw UUID format: "uuid"
          const artifact = useArtifactStore.getState().artifacts.find((a) => a.id === artifactId)

          if (artifact) {
            setArtifact(artifact)
          } else {
            await fetchArtifacts()
            const artifact = useArtifactStore.getState().artifacts.find((a) => a.id === artifactId)

            if (artifact) {
              setArtifact(artifact)
            } else {
              setError(`Artifact with id "${artifactId}" not found`)
            }
          }
        } else {
          setError(`Invalid artifact ID format: "${artifactId}"`)
        }
      } catch (e: any) {
        setError(e.message || "Failed to load artifact")
      } finally {
        setLoading(false)
      }
    }

    loadArtifact()
  }, [artifactId, fetchArtifacts, searchArtifacts])

  if (loading) {
    return <span className="text-muted-foreground text-sm">Loading artifact...</span>
  }

  if (error) {
    return <span className="text-destructive text-sm">Error: {error}</span>
  }

  if (!artifact) {
    return <span className="text-muted-foreground text-sm">Artifact not found.</span>
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm border border-primary/20">
      <span className="font-medium">
        {children
          ? React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return child.replace(/{{artifact}}/g, artifact.title)
              }
              return child
            })
          : artifact.title}
      </span>
      <span className="text-xs text-muted-foreground">({artifact.content_type})</span>
    </span>
  )
}

export default ArtifactReference
