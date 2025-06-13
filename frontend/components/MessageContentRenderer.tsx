import React from 'react'
import RephrasedTextIndicator from './RephrasedTextIndicator'
import MarkdownRenderer from './MemoizedMarkdown'

interface MessageContentRendererProps {
  content: string
  messageId: string
  threadId: string
  onCodeConvert?: (originalCode: string, convertedCode: string, target: string) => void
  onRevertRephrase?: (originalText: string) => void
  isMarkdown?: boolean
}

interface RephrasedSection {
  type: 'normal' | 'rephrased'
  text: string
  originalText?: string
}

// Parse content to identify rephrased sections
function parseContentForRephrasing(content: string): RephrasedSection[] {
  const sections: RephrasedSection[] = []
  
  // Look for rephrased patterns like "*[Rephrased]: new text*"
  const rephrasedRegex = /\*\[Rephrased\]:\s*(.*?)\*/g
  let lastIndex = 0
  let match
  
  while ((match = rephrasedRegex.exec(content)) !== null) {
    // Add normal text before this match
    if (match.index > lastIndex) {
      const beforeText = content.slice(lastIndex, match.index).trim()
      if (beforeText) {
        sections.push({
          type: 'normal',
          text: beforeText
        })
      }
    }
    
    // Add the rephrased section
    const rephrasedText = match[1]
    const beforeMatch = content.slice(0, match.index).trim()
    
    // Try to find the original text by looking at what comes before
    // This is a simple heuristic - in practice you might want more sophisticated parsing
    const originalText = extractOriginalText(beforeMatch, rephrasedText)
    
    sections.push({
      type: 'rephrased',
      text: rephrasedText,
      originalText: originalText || rephrasedText
    })
    
    lastIndex = rephrasedRegex.lastIndex
  }
  
  // Add remaining normal text
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim()
    if (remainingText) {
      sections.push({
        type: 'normal',
        text: remainingText
      })
    }
  }
  
  // If no rephrased sections found, return the entire content as normal
  if (sections.length === 0) {
    sections.push({
      type: 'normal',
      text: content
    })
  }
  
  return sections
}

// Simple heuristic to extract original text
function extractOriginalText(beforeText: string, rephrasedText: string): string {
  // Look for sentences that might be the original
  const sentences = beforeText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
  
  // Return the last meaningful sentence as a rough approximation
  // In a real implementation, you might want to track this more precisely
  const lastSentence = sentences[sentences.length - 1]
  return lastSentence || rephrasedText
}

export default function MessageContentRenderer({
  content,
  messageId,
  threadId,
  onCodeConvert,
  onRevertRephrase,
  isMarkdown = true
}: MessageContentRendererProps) {
  const sections = parseContentForRephrasing(content)
  
  // If there are no rephrased sections, render normally
  if (sections.length === 1 && sections[0].type === 'normal') {
    return isMarkdown ? (
      <MarkdownRenderer
        content={content}
        id={messageId}
        threadId={threadId}
        messageId={messageId}
        onCodeConvert={onCodeConvert}
      />
    ) : (
      <span className="whitespace-pre-wrap">{content}</span>
    )
  }
  
  // Render mixed content with highlighted rephrased sections
  return (
    <div className="space-y-1">
      {sections.map((section, index) => {
        const key = `${messageId}-section-${index}`
        
        if (section.type === 'normal') {
          return isMarkdown ? (
            <MarkdownRenderer
              key={key}
              content={section.text}
              id={`${messageId}-${index}`}
              threadId={threadId}
              messageId={messageId}
              onCodeConvert={onCodeConvert}
            />
          ) : (
            <span key={key} className="whitespace-pre-wrap">{section.text}</span>
          )
        } else {
          // Rephrased section
          return (
            <RephrasedTextIndicator
              key={key}
              originalText={section.originalText || section.text}
              rephrasedText={section.text}
              onRevert={() => {
                if (onRevertRephrase && section.originalText) {
                  onRevertRephrase(section.originalText)
                }
              }}
            />
          )
        }
      })}
    </div>
  )
} 