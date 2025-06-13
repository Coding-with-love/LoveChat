import type React from "react"

interface ThinkingContentProps {
  reasoning: string | null | undefined
}

const ThinkingContent: React.FC<ThinkingContentProps> = ({ reasoning }) => {
  // Add a function to detect and clean up repetitive patterns in thinking content
  function cleanupThinkingContent(content: string): string {
    // Check for repetitive sentence beginnings
    const repetitivePattern = /(\b\w+(?:\s+\w+){0,5})\s+\1\s+\1/gi
    if (repetitivePattern.test(content)) {
      // Replace repetitive patterns with a single instance
      content = content.replace(repetitivePattern, "$1")

      // Add a note about repetition
      content += "\n\n[Note: Some repetitive content was detected and cleaned up]"
    }

    return content
  }

  // Use this function when rendering thinking content
  const cleanedReasoning = reasoning ? cleanupThinkingContent(reasoning) : ""

  return <div>{cleanedReasoning && <div style={{ whiteSpace: "pre-line" }}>{cleanedReasoning}</div>}</div>
}

export default ThinkingContent
