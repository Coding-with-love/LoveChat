"use client"

import { memo, useMemo } from "react"
import MarkdownRenderer from "@/frontend/components/MemoizedMarkdown"
import ArtifactReference from "./ArtifactReference"

interface MessageContentRendererProps {
  content: string
  messageId: string
  threadId: string
  onCodeConvert?: (originalCode: string, convertedCode: string, target: string) => void
  onRevertRephrase?: (originalText: string) => void
  isMarkdown?: boolean
  onViewInGallery?: (artifactId: string) => void
}

function PureMessageContentRenderer({
  content,
  messageId,
  threadId,
  onCodeConvert,
  onRevertRephrase,
  isMarkdown = true,
  onViewInGallery,
}: MessageContentRendererProps) {
  // Parse artifact references in the content and replace with friendly display
  const processedContent = useMemo(() => {
    if (!content) return { text: "", artifactRefs: [] }

    // Enhanced artifact reference detection that works across chats
    const patterns = [
      // Technical format: [Artifact: Title](artifact://id)
      /\[Artifact:\s*([^\]]+)\]$$artifact:\/\/([^)]+)$$/g,
      // Short format: @artifact:id
      /@artifact:([a-zA-Z0-9-]+)/g,
      // Our new badge format: @artifact[id] or @artifact[id:insert]
      /@artifact\[([a-f0-9-]+)(?::insert)?\]/g,
      // Natural formats that work across chats
      /(?:my|the)\s+"([^"]+)"\s+artifact/gi,
      /artifact\s+(?:called|named)\s+"([^"]+)"/gi,
      /(?:reference|using|with)\s+my\s+"([^"]+)"\s+(?:artifact|code|file)/gi,
    ]

    const artifactRefs: Array<{ id: string; title: string; match: string; type: "technical" | "natural" }> = []

    patterns.forEach((pattern, patternIndex) => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        if (patternIndex === 0 && match[1] && match[2]) {
          // Technical format with ID
          artifactRefs.push({
            id: match[2],
            title: match[1],
            match: match[0],
            type: "technical",
          })
        } else if (patternIndex === 1 && match[1]) {
          // Short format with ID
          artifactRefs.push({
            id: match[1],
            title: `Artifact ${match[1]}`,
            match: match[0],
            type: "technical",
          })
        } else if (patternIndex === 2 && match[1]) {
          // Our badge format - replace with friendly text
          const isInsert = match[0].includes(":insert")
          artifactRefs.push({
            id: match[1],
            title: isInsert ? "inserted artifact" : "referenced artifact",
            match: match[0],
            type: "technical",
          })
        } else if (match[1]) {
          // Natural format - lookup by title
          artifactRefs.push({
            id: `title:${match[1]}`,
            title: match[1],
            match: match[0],
            type: "natural",
          })
        }
      }
    })

    // Replace artifact references with friendly placeholders
    let processedText = content
    artifactRefs.forEach((ref, index) => {
      // Replace ugly @artifact[id] with friendly text
      if (ref.match.startsWith("@artifact[")) {
        const isInsert = ref.match.includes(":insert")
        const friendlyText = isInsert ? "my inserted artifact" : "my referenced artifact"
        processedText = processedText.replace(ref.match, friendlyText)
      } else {
        processedText = processedText.replace(ref.match, `__ARTIFACT_REF_${index}__`)
      }
    })

    return { text: processedText, artifactRefs }
  }, [content])

  // Split content by artifact reference placeholders
  const contentParts = useMemo(() => {
    const { text, artifactRefs } = processedContent
    const parts: Array<{ type: "text" | "artifact"; content: string; artifactId?: string }> = []

    if (artifactRefs.length === 0) {
      parts.push({ type: "text", content: text })
      return parts
    }

    let currentText = text
    artifactRefs.forEach((ref, index) => {
      const placeholder = `__ARTIFACT_REF_${index}__`
      const splitParts = currentText.split(placeholder)

      if (splitParts[0]) {
        parts.push({ type: "text", content: splitParts[0] })
      }

      parts.push({ type: "artifact", content: ref.title, artifactId: ref.id })

      currentText = splitParts.slice(1).join(placeholder)
    })

    if (currentText) {
      parts.push({ type: "text", content: currentText })
    }

    return parts
  }, [processedContent])

  const handleViewInGallery = (artifactId: string) => {
    if (onViewInGallery) {
      onViewInGallery(artifactId)
    }
  }

  return (
    <div className="space-y-3">
      {contentParts.map((part, index) => {
        if (part.type === "artifact" && part.artifactId) {
          return (
            <ArtifactReference
              key={`artifact-${part.artifactId}-${index}`}
              artifactId={part.artifactId}
            />
          )
        }

        if (part.content.trim()) {
          return isMarkdown ? (
            <MarkdownRenderer
              key={`text-${index}`}
              content={part.content}
              id={messageId}
              threadId={threadId}
              onCodeConvert={onCodeConvert}
              isArtifactMessage={true}
            />
          ) : (
            <div key={`text-${index}`} className="whitespace-pre-wrap">
              {part.content}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

const MessageContentRenderer = memo(PureMessageContentRenderer)

export default MessageContentRenderer
