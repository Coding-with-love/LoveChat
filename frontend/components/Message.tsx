"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import MarkdownRenderer from "@/frontend/components/MemoizedMarkdown"
import { cn } from "@/lib/utils"
import type { UIMessage } from "ai"
import MessageControls from "./MessageControls"
import type { UseChatHelpers } from "@ai-sdk/react"
import MessageEditor from "./MessageEditor"
import MessageReasoning from "./MessageReasoning"
import FileAttachmentViewer from "./FileAttachmentViewer"
import MessageSources from "./MessageSources"
import WebSearchBanner from "./WebSearchBanner"
import { useKeyboardShortcuts } from "@/frontend/hooks/useKeyboardShortcuts"
import { useTextSelection } from "@/frontend/hooks/useTextSelection"
import { useAIActions } from "@/frontend/hooks/useAIActions"
import AIContextMenu from "./AIContextMenu"
import AIActionResultDialog from "./AIActionResultDialog"

import MessageContentRenderer from "./MessageContentRenderer"
import { ArtifactCard } from "./ArtifactCard"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import { useWorkflowStore } from "@/frontend/stores/WorkflowStore"
import { Badge } from "@/frontend/components/ui/badge"
import { Button } from "@/frontend/components/ui/button"
import { Code, FileText, Copy, Plus, Workflow, Play, CheckCircle2, Clock, AlertCircle, Zap, Sparkles } from "lucide-react"
import { ArtifactIndicator, MessageArtifactSummary } from "./ArtifactIndicator"
import MessageAttemptNavigator from "./MessageAttemptNavigator"
import type { WorkflowExecution } from "@/lib/types/workflow"
import { WorkflowExecutionRenderer } from "./WorkflowExecutionRenderer"

// Helper function to check equality (you might want to import this from a utility library)
function equal(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Extract search query from message content
function extractSearchQuery(content?: string): string | null {
  if (!content) return null
  
  // Look for common search patterns in the content
  const patterns = [
    /search(?:ing)?\s+(?:for\s+)?["']([^"']+)["']/i,
    /looking\s+(?:up|for)\s+["']([^"']+)["']/i,
    /researching\s+["']([^"']+)["']/i,
    /find(?:ing)?\s+information\s+about\s+["']([^"']+)["']/i,
    /query:\s*["']([^"']+)["']/i,
    /search\s+results?\s+for\s+["']([^"']+)["']/i
  ]
  
  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

// Extend UIMessage to include reasoning field, message attempts, and workflow information
interface ExtendedUIMessage extends UIMessage {
  reasoning?: string
  attempts?: ExtendedUIMessage[]
  currentAttemptIndex?: number
  parentMessageId?: string
  attemptNumber?: number
  isActiveAttempt?: boolean
  workflowExecutionId?: string
  workflowId?: string
  workflowName?: string
}

function PureMessage({
  threadId,
  message,
  setMessages,
  reload,
  isStreaming,
  registerRef,
  stop,
  resumeComplete,
  resumedMessageId,
  showThinking,
  toggleThinking,
  isThinkingModel,
  onRevertToOriginal,
}: {
  threadId: string
  message: ExtendedUIMessage
  setMessages: UseChatHelpers["setMessages"]
  reload: UseChatHelpers["reload"]
  isStreaming: boolean
  registerRef: (id: string, ref: HTMLDivElement | null) => void
  stop: UseChatHelpers["stop"]
  resumeComplete?: boolean
  resumedMessageId?: string | null
  showThinking?: boolean
  toggleThinking?: () => void
  isThinkingModel?: boolean
  onRevertToOriginal?: (originalText: string) => void
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [showAnimation, setShowAnimation] = useState(false)
  const [isCurrentlyThinking, setIsCurrentlyThinking] = useState(false)
  const [currentAttemptIndex, setCurrentAttemptIndex] = useState(0)

  // Artifact detection and display
  const { getArtifactsByMessageId, fetchArtifacts } = useArtifactStore()
  const [messageArtifacts, setMessageArtifacts] = useState<any[]>([])

  useEffect(() => {
    const artifacts = getArtifactsByMessageId(message.id)
    setMessageArtifacts(artifacts)
  }, [message.id, getArtifactsByMessageId])

  // Workflow functionality
  const { executeWorkflow, createWorkflow, executions, fetchExecutions } = useWorkflowStore()
  const [workflowExecution, setWorkflowExecution] = useState<WorkflowExecution | null>(null)
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false)

  // Fetch workflow execution if this message is associated with one
  useEffect(() => {
    if (message.workflowExecutionId) {
      const execution = executions.find(e => e.id === message.workflowExecutionId)
      setWorkflowExecution(execution || null)
      
      // If not found in store, fetch executions
      if (!execution) {
        fetchExecutions()
      }
    }
  }, [message.workflowExecutionId, executions, fetchExecutions])

  // Message attempts handling
  const attempts = message.attempts || [message]
  const totalAttempts = attempts.length
  const currentMessage = attempts[currentAttemptIndex] || message
  
  // Use real attempts from the message or fallback to single message
  const actualAttempts = message.attempts || [message]
  const actualTotalAttempts = actualAttempts.length
  const actualCurrentMessage = actualAttempts[currentAttemptIndex] || message

  // Reset attempt index if it exceeds available attempts
  useEffect(() => {
    if (currentAttemptIndex >= actualTotalAttempts) {
      setCurrentAttemptIndex(Math.max(0, actualTotalAttempts - 1))
    }
  }, [currentAttemptIndex, actualTotalAttempts])

  const handlePreviousAttempt = useCallback(() => {
    setCurrentAttemptIndex(prev => Math.max(0, prev - 1))
  }, [])

  const handleNextAttempt = useCallback(() => {
    setCurrentAttemptIndex(prev => Math.min(actualTotalAttempts - 1, prev + 1))
  }, [actualTotalAttempts])

  // Extract reasoning from current message - check multiple sources with improved parsing
  const reasoning =
    actualCurrentMessage.reasoning ||
    actualCurrentMessage.parts?.find((part) => part.type === "reasoning")?.reasoning ||
    (() => {
      // Also check if thinking content is embedded in text parts
      const textPart = actualCurrentMessage.parts?.find((part) => part.type === "text")
      if (textPart?.text) {
        // For streaming thinking models, extract both complete and partial thinking content
        if (textPart.text.includes("<think>") || textPart.text.includes("<Thinking>")) {
          // Handle both complete and partial thinking blocks with improved parsing
          const thinkMatches = textPart.text.match(/<think>([\s\S]*?)<\/think>|<Thinking>([\s\S]*?)<\/Thinking>/g)
          if (thinkMatches) {
            const extracted = thinkMatches.map(match => 
              match.replace(/<think>|<\/think>|<Thinking>|<\/Thinking>/g, "").trim()
            ).filter(content => content.length > 0).join('\n\n')
            
            // Clean up any repetitive content or malformed reasoning
            const cleaned = extracted
              .replace(/^\s*[-•]\s*/gm, '') // Remove bullet points
              .replace(/(\n\s*){3,}/g, '\n\n') // Remove excessive line breaks
              .replace(/^(.*?)\1+$/gm, '$1') // Remove simple repetitions
              .trim()
            
            return cleaned.length > 10 ? cleaned : null
          }

          // Handle incomplete thinking block (streaming in progress)
          if (isStreaming) {
            const partialMatch = textPart.text.match(/<think>([\s\S]*?)$|<Thinking>([\s\S]*?)$/)
            if (partialMatch) {
              const partial = (partialMatch[1] || partialMatch[2] || "").trim()
              return partial.length > 5 ? partial : null
            }
          }
        }
      }
      return null
    })()

  // Debug reasoning extraction with improved logging for deepseek models
  console.log("🧠 Message reasoning debug:", {
    messageId: message.id,
    hasDirectReasoning: !!actualCurrentMessage.reasoning,
    hasReasoningParts: !!actualCurrentMessage.parts?.find((part) => part.type === "reasoning"),
    extractedReasoning: !!reasoning,
    reasoningLength: reasoning?.length || 0,
    reasoningPreview: reasoning?.substring(0, 100) || "none",
    isStreaming,
  })

  // Refresh artifacts when streaming stops to catch auto-generated artifacts
  useEffect(() => {
    if (!isStreaming && message.role === "assistant") {
      // Delay to allow backend artifact creation to complete
      const timeoutId = setTimeout(() => {
        fetchArtifacts({ messageId: message.id })
      }, 1000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isStreaming, message.role, message.id, fetchArtifacts])



  const messageRef = useRef<HTMLDivElement>(null)

  // AI Actions functionality
  const { selection, clearSelection } = useTextSelection()
  const {
    isProcessing: isAIProcessing,
    result: aiResult,
    showResult: showAIResult,
    processAction,
    closeResult: closeAIResult,
    retryAction,
  } = useAIActions()

  // Register this message's ref for navigation
  useEffect(() => {
    registerRef(message.id, messageRef.current)
    return () => registerRef(message.id, null)
  }, [message.id, registerRef])

  // Handle thinking state for streaming messages
  useEffect(() => {
    if (isStreaming && isThinkingModel && actualCurrentMessage.role === "assistant") {
      // Show thinking indicator while streaming and no content yet
      const hasContent = actualCurrentMessage.parts?.some((part) => part.type === "text" && part.text.trim())
      setIsCurrentlyThinking(!hasContent)
    } else {
      setIsCurrentlyThinking(false)
    }
  }, [isStreaming, isThinkingModel, actualCurrentMessage.role, actualCurrentMessage.parts])

  // Handle resume completion animation
  useEffect(() => {
    if (resumeComplete && resumedMessageId === message.id) {
      console.log("🎉 Triggering completion animation for message:", message.id)
      setShowAnimation(true)

      // Reset animation after duration
      const timer = setTimeout(() => {
        setShowAnimation(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [resumeComplete, resumedMessageId, message.id])

  // Extract file attachments from current message parts
  const fileAttachments =
    (actualCurrentMessage.parts?.find((part) => (part as any).type === "file_attachments") as any)?.attachments || []

  // Extract artifact references from current message parts
  const artifactReferences =
    (actualCurrentMessage.parts?.find((part) => (part as any).type === "artifact_references") as any)?.artifacts || []

  // Extract sources if available
  const sources: any[] = (actualCurrentMessage.parts as any)?.find((part: any) => part.type === "sources")?.sources || []

  // Check if this message used web search (during streaming or after)
  const hasWebSearchIndicators = actualCurrentMessage.content?.includes("📊 Web Search Results:") || 
    actualCurrentMessage.content?.includes("🔍") || 
    actualCurrentMessage.content?.includes("web search") ||
    actualCurrentMessage.content?.includes("search results") ||
    actualCurrentMessage.content?.includes("searching the web") ||
    actualCurrentMessage.content?.includes("🔍 Executing web search")
  
  // Show WebSearchBanner immediately during streaming if we detect web search activity
  // Also show if there are sources available (after completion)
  const usedWebSearch = sources.length > 0 || (isStreaming && hasWebSearchIndicators)

  // Check if this is a workflow execution message
  const isWorkflowExecution = actualCurrentMessage.content?.includes('🚀') && 
    (actualCurrentMessage.content?.includes('Executing workflow:') || actualCurrentMessage.content?.includes('Starting workflow:')) &&
    actualCurrentMessage.content?.includes('⚡')

  // Filter out tool calls and other non-user-facing parts
  const displayParts =
  actualCurrentMessage.parts?.filter((part) => {
      if (actualCurrentMessage.role === "user") {
        return part.type === "text" || part.type === "reasoning"
      }
  return part.type === "text" || part.type === "reasoning"
  
    
}
) || []

// Handle code conversion - use useCallback to prevent unnecessary re-renders
const handleCodeConvert = useCallback(
    (originalCode: string, convertedCode: string, target: string) => {
      console.log("🔄 Code converted in Message component:", {
        messageId: message.id,
        target,
        originalLength: originalCode.length,
        convertedLength: convertedCode.length,
      })


      // The actual saving is handled in the MemoizedMarkdown component
      // We don't need to do anything here to update the UI
    },
    [message.id],
  )

  // Debug: Log when Message component renders to verify onCodeConvert is defined
  console.log("🔍 Message component render debug:", {
    messageId: message.id,
    role: message.role,
    hasHandleCodeConvert: !!handleCodeConvert,
    threadId
  })

// Handle keyboard shortcuts
const handleCopy = useCallback(() => {
    const textPart = displayParts.find((part) => part.type === "text")
    if (textPart) {
      navigator.clipboard.writeText(textPart.text)
    }
  }, [displayParts])

const handleEdit = useCallback(() => {
    if (mode === "view") {
      setMode("edit")
    }
  }, [mode])

const handlePin = useCallback(() => {
    // Pin functionality is handled in MessageControls
    // We'll pass this through to MessageControls
  }, [])


const handleAIAction = useCallback(
    async (
      action: "explain" | "translate" | "rephrase" | "summarize",
      text: string,
      targetLanguage?: string,
    ): Promise<string | null> => {
      const result = await processAction(action, text, targetLanguage)
      clearSelection()
      return result
    },
    [processAction, clearSelection],
  )

// Handle keyboard shortcuts with AI actions
const handleExplainSelection = useCallback(() => {
    const selectedText = window.getSelection()?.toString().trim()
    if (selectedText && selectedText.length > 3) {
      handleAIAction("explain", selectedText)
    }
  }, [handleAIAction])

const handleTranslateSelection = useCallback(() => {
    const selectedText = window.getSelection()?.toString().trim()
    if (selectedText && selectedText.length > 3) {
      handleAIAction("translate", selectedText, "Spanish")
    }
  }, [handleAIAction])

const handleRephraseSelection = useCallback(() => {
    const selectedText = window.getSelection()?.toString().trim()
    if (selectedText && selectedText.length > 3) {
      handleAIAction("rephrase", selectedText)
    }
  }, [handleAIAction])

useKeyboardShortcuts({
    onCopyMessage: handleCopy,
    onEditMessage: handleEdit,
    onPinMessage: handlePin,
  })

// Check if the selection is within this message component
const isSelectionInThisMessage = useCallback(() => {
    if (!selection || !messageRef.current) return false

    const selectionNode = window.getSelection()?.anchorNode
    if (!selectionNode) return false

    return messageRef.current.contains(selectionNode)
  }, [selection])

  const handleViewInGallery = useCallback((artifact: any) => {
    // Navigate to artifacts gallery with this artifact highlighted
    window.location.href = `/artifacts?highlight=${artifact.id}`
  }, [])

  // Workflow-related handlers
  const handleCreateWorkflowFromMessage = useCallback(async () => {
    if (message.role !== "assistant" || !actualCurrentMessage.content) return
    
    setIsCreatingWorkflow(true)
    try {
      const textContent = actualCurrentMessage.content
      
      // Create a basic workflow from this message content
      await createWorkflow({
        name: `Workflow from ${new Date().toLocaleDateString()}`,
        description: `Generated from assistant message: ${textContent.substring(0, 100)}...`,
        steps: [
          {
            id: "step_1",
            name: "Process Request",
            prompt: textContent,
            description: "Process the user request based on the assistant's response"
          }
        ],
        is_public: false,
        tags: ["generated", "assistant-response"]
      })
      
      // Optional: Show success toast or notification
      console.log("✅ Workflow created from message")
    } catch (error) {
      console.error("Failed to create workflow from message:", error)
    } finally {
      setIsCreatingWorkflow(false)
    }
  }, [message.role, actualCurrentMessage.content, createWorkflow])

  const getWorkflowStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'running':
        return <Clock className="h-3 w-3 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'cancelled':
        return <AlertCircle className="h-3 w-3 text-gray-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  // Get artifact icon
  const getArtifactIcon = (contentType: string) => {
    switch (contentType) {
      case "code":
      case "javascript":
      case "typescript":
      case "python":
        return <Code className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  // Check if this is a workflow execution message
  const isWorkflowExecutionMessage = message.role === "user" && 
    message.content.includes("[EXECUTE_WORKFLOW]")

  // If this is a workflow execution user message, show a special indicator instead
  if (isWorkflowExecutionMessage) {
    const workflowNameMatch = message.content.match(/WORKFLOW_NAME: (.+)/)
    const workflowName = workflowNameMatch ? workflowNameMatch[1] : "Unknown Workflow"
    
    return (
      <div
        ref={messageRef}
        role="article"
        className="flex flex-col transition-all duration-500 relative items-start w-full"
        data-message-id={message.id}
        data-message-content="true"
      >
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-accent/50 border border-border rounded-lg text-sm">
          <Workflow className="h-4 w-4 text-primary" />
          <span className="text-primary font-medium">
            🚀 Executing workflow: {workflowName}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={messageRef}
      role="article"
      className={cn(
        "flex flex-col transition-all duration-500 relative",
        message.role === "user" ? "items-end" : "items-start",
        showAnimation && "animate-pulse",
      )}
      data-message-id={message.id}
      data-message-content="true" // Add this attribute to help identify message content areas
    >
      {/* Web Search Banner for Assistant Messages (only for non-workflow messages) */}
      {message.role === "assistant" && usedWebSearch && !isWorkflowExecution && (
        <WebSearchBanner 
          query={sources[0]?.query || extractSearchQuery(actualCurrentMessage.content) || "Web search"}
          resultCount={sources.length || 7}
          searchResults={sources.map((source: any) => ({
            title: source.title || source.name || "Search Result",
            snippet: source.snippet || source.description || source.text || "",
            url: source.url || source.link || "#",
            source: source.source || source.domain,
            domain: source.domain || source.source,
            query: source.query
          }))}
          isStreaming={isStreaming}
        />
      )}

      {/* Workflow Execution Banner for Assistant Messages */}
      {message.role === "assistant" && (message.workflowExecutionId || workflowExecution) && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-accent/50 border border-border rounded-lg text-sm">
          <Workflow className="h-4 w-4 text-primary" />
          <span className="text-primary font-medium">
            Generated by workflow: {message.workflowName || workflowExecution?.workflow_id}
          </span>
          {workflowExecution && (
            <div className="flex items-center gap-1 ml-auto">
              {getWorkflowStatusIcon(workflowExecution.status)}
              <span className="text-xs capitalize text-primary">
                {workflowExecution.status}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Thinking Indicator for streaming thinking models */}
      {isCurrentlyThinking && (
        <div className="mb-3">
  
        </div>
      )}

      {(() => {
        // For assistant messages, render reasoning parts first, then text parts
        if (message.role === "assistant") {
          const reasoningParts = displayParts.filter((part) => part.type === "reasoning")
          const textParts = displayParts.filter((part) => part.type === "text")
          const orderedParts = [...reasoningParts, ...textParts]

          // If we have reasoning but no reasoning parts, add it as a virtual part
          // For thinking models, always show reasoning if available, even during streaming
          if (reasoning && reasoningParts.length === 0) {
            console.log("🧠 Adding virtual reasoning part:", {
              messageId: message.id,
              reasoningLength: reasoning.length,
              reasoningPreview: reasoning.substring(0, 100)
            })
            orderedParts.unshift({ type: "reasoning", reasoning } as any)
          }

          console.log("🧠 Final ordered parts for message:", {
            messageId: message.id,
            totalParts: orderedParts.length,
            reasoningParts: orderedParts.filter(p => p.type === "reasoning").length,
            textParts: orderedParts.filter(p => p.type === "text").length,
            isThinkingModel,
            hasReasoning: !!reasoning
          })

          return orderedParts.map((part, index) => {
            const { type } = part
            const key = `message-${message.id}-part-${index}`

            if (type === "reasoning") {
              return <MessageReasoning 
                key={key} 
                reasoning={part.reasoning} 
                id={message.id} 
                isStreaming={isStreaming}
                autoExpand={isThinkingModel}
              />
            }

            if (type === "text") {
              // CRITICAL FIX: Use actualCurrentMessage.content if available (for updated messages), otherwise fall back to part.text
              // This ensures that rephrased text saved to the database is displayed correctly
              let cleanText = actualCurrentMessage.content || part.text
              let extractedThinking = ""

              // Handle both <think> and <Thinking> tags with improved cleaning for deepseek models
              if (cleanText.includes("<think>") || cleanText.includes("<Thinking>")) {
                // Extract thinking content for potential display
                const thinkMatches = cleanText.match(/<think>([\s\S]*?)<\/think>|<Thinking>([\s\S]*?)<\/Thinking>/g)
                if (thinkMatches) {
                  thinkMatches.forEach((match) => {
                    const thinkingContent = match.replace(/<think>|<\/think>|<Thinking>|<\/Thinking>/g, "").trim()
                    if (thinkingContent.length > 0) {
                      extractedThinking += thinkingContent + "\n"
                    }
                  })
                }

                // Remove thinking tags from displayed content more aggressively
                cleanText = cleanText
                  .replace(/<think>[\s\S]*?<\/think>/g, "")
                  .replace(/<Thinking>[\s\S]*?<\/Thinking>/g, "")
                  .replace(/^\s*\n+/gm, '') // Remove leading whitespace and newlines
                  .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
                  .trim()

                // If we're still streaming and have an incomplete thinking tag, remove it too
                if (isStreaming) {
                  cleanText = cleanText
                    .replace(/<think>[\s\S]*$/, "")
                    .replace(/<Thinking>[\s\S]*$/, "")
                    .trim()
                }

                // Log the cleaning process for debugging
                console.log("🧠 Text cleaning for thinking model:", {
                  messageId: message.id,
                  originalLength: (actualCurrentMessage.content || part.text).length,
                  cleanedLength: cleanText.length,
                  extractedThinkingLength: extractedThinking.length,
                  hasIncompleteTags: isStreaming && (cleanText.includes("<think>") || cleanText.includes("<Thinking>"))
                })
              }

              // Check if this is a workflow execution message
              const isWorkflowExecution = cleanText.includes('🚀') && 
                (cleanText.includes('Executing workflow:') || cleanText.includes('Starting workflow:')) &&
                cleanText.includes('⚡')

              if (isWorkflowExecution) {
                return (
                  <div key={key} className="group flex flex-col gap-2 w-full relative" data-message-content-part="true">
                    <WorkflowExecutionRenderer 
                      content={cleanText}
                      isStreaming={isStreaming}
                      sources={sources}
                    />
                  </div>
                )
              }

              return (
                <div key={key} className="group flex flex-col gap-2 w-full relative" data-message-content-part="true">
                  <div
                    className={cn(
                      "transition-all duration-500 relative select-text",
                      showAnimation && [
                        "transform scale-[1.02] shadow-lg",
                        "bg-gradient-to-r from-green-50 via-muted to-purple-50",
                        "dark:from-green-950/20 dark:via-muted dark:to-purple-950/20",
                        "border border-green-200 dark:border-green-800",
                      ],
                    )}
                    data-message-text-content="true" // Add this attribute to help identify text content areas
                  >
                    <MessageContentRenderer
                      content={cleanText}
                      messageId={message.id}
                      threadId={threadId}
                      onCodeConvert={handleCodeConvert}
                      onRevertRephrase={onRevertToOriginal}
                      isMarkdown={true}
                    />

                    {/* Completion celebration effect */}
                    {showAnimation && <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>}
                  </div>

                  {!isStreaming && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArtifactIndicator 
                          messageId={message.id}
                          threadId={threadId}
                          variant="icon"
                          className="opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                        {message.role === "assistant" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCreateWorkflowFromMessage}
                            disabled={isCreatingWorkflow}
                            className="opacity-60 group-hover:opacity-100 transition-opacity h-6 px-2 text-xs"
                            title="Create workflow from this response"
                          >
                            {isCreatingWorkflow ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {currentMessage.role === "assistant" && (
                          <MessageAttemptNavigator
                            currentIndex={currentAttemptIndex}
                            totalAttempts={totalAttempts}
                            onPrevious={handlePreviousAttempt}
                            onNext={handleNextAttempt}
                            className="opacity-60 group-hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                      <MessageControls
                        threadId={threadId}
                        content={cleanText}
                        message={message}
                        setMessages={setMessages}
                        reload={reload}
                        stop={stop}
                        onCopy={handleCopy}
                        onEdit={handleEdit}
                        onPin={handlePin}
                      />
                    </div>
                  )}
                </div>
              )
            }

            return null
          })
        }

        // For user messages, keep original order
        const userParts = [...displayParts]
        
        // If we have reasoning but no reasoning parts, add it as a virtual part
        if (reasoning && !displayParts.some(part => part.type === "reasoning")) {
          userParts.unshift({ type: "reasoning", reasoning } as any)
        }
        
        return userParts.map((part, index) => {
          const { type } = part
          const key = `message-${message.id}-part-${index}`

          if (type === "reasoning") {
            return <MessageReasoning 
              key={key} 
              reasoning={part.reasoning} 
              id={message.id} 
              isStreaming={isStreaming}
              autoExpand={isThinkingModel}
            />
          }

          if (type === "text") {
            // CRITICAL FIX: Use actualCurrentMessage.content if available (for updated messages), otherwise fall back to part.text
            // This ensures that rephrased text saved to the database is displayed correctly
            let cleanText = actualCurrentMessage.content || part.text
            if (cleanText.includes("<Thinking>") && cleanText.includes("</Thinking>")) {
              cleanText = cleanText.replace(/<Thinking>[\s\S]*?<\/Thinking>/g, "").trim()
            }

            return message.role === "user" ? (
              <div key={key} className="w-full flex justify-end" data-message-content-part="true">
                <div className="group flex flex-col gap-2 max-w-[80%] sm:max-w-[75%] lg:max-w-[70%]">
                  <div
                    className="relative px-4 py-3 rounded-xl bg-secondary border border-secondary-foreground/2"
                  >
                    {mode === "edit" && (
                      <MessageEditor
                        threadId={threadId}
                        message={message}
                        content={cleanText}
                        setMessages={setMessages}
                        reload={reload}
                        setMode={setMode}
                        stop={stop}
                      />
                    )}
                    {mode === "view" && (
                      <div className="space-y-3">
                        <MessageContentRenderer
                          content={cleanText}
                          messageId={message.id}
                          threadId={threadId}
                          onRevertRephrase={onRevertToOriginal}
                          isMarkdown={false}
                        />
                      </div>
                    )}
                  </div>

                  {mode === "view" && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArtifactIndicator 
                          messageId={message.id}
                          threadId={threadId}
                          variant="icon"
                          className="opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                        {currentMessage.role === "assistant" && (
                          <MessageAttemptNavigator
                            currentIndex={currentAttemptIndex}
                            totalAttempts={totalAttempts}
                            onPrevious={handlePreviousAttempt}
                            onNext={handleNextAttempt}
                            className="opacity-60 group-hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                      <MessageControls
                        threadId={threadId}
                        content={cleanText}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                        stop={stop}
                        onCopy={handleCopy}
                        onEdit={handleEdit}
                        onPin={handlePin}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={key} className="group flex flex-col gap-2 w-full relative" data-message-content-part="true">
                <div
                  className={cn(
                    "transition-all duration-500 relative select-text",
                    usedWebSearch &&
                      "border-l-4 border-border pl-4 bg-muted/20 rounded-lg shadow-sm",
                    showAnimation && [
                      "transform scale-[1.02] shadow-lg",
                      "bg-gradient-to-r from-green-50 via-muted to-purple-50",
                      "dark:from-green-950/20 dark:via-muted dark:to-purple-950/20",
                      "border border-green-200 dark:border-green-800",
                    ],
                  )}
                  data-message-text-content="true" // Add this attribute to help identify text content areas
                >
                  <MessageContentRenderer
                    content={cleanText}
                    messageId={message.id}
                    threadId={threadId}
                    onCodeConvert={handleCodeConvert}
                    onRevertRephrase={onRevertToOriginal}
                    isMarkdown={true}
                  />

                  {/* Completion celebration effect */}
                  {showAnimation && <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>}
                </div>

                {!isStreaming && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArtifactIndicator 
                        messageId={message.id}
                        threadId={threadId}
                        variant="minimal"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      {message.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCreateWorkflowFromMessage}
                          disabled={isCreatingWorkflow}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2 text-xs"
                          title="Create workflow from this response"
                        >
                          {isCreatingWorkflow ? (
                            <Clock className="h-3 w-3 animate-spin" />
                          ) : (
                            <Zap className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      {currentMessage.role === "assistant" && (
                        <MessageAttemptNavigator
                          currentIndex={currentAttemptIndex}
                          totalAttempts={totalAttempts}
                          onPrevious={handlePreviousAttempt}
                          onNext={handleNextAttempt}
                          className="opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                    <MessageControls
                      threadId={threadId}
                      content={cleanText}
                      message={message}
                      setMessages={setMessages}
                      reload={reload}
                      stop={stop}
                      onCopy={handleCopy}
                      onEdit={handleEdit}
                      onPin={handlePin}
                    />
                  </div>
                )}
              </div>
            )
          }

          return null
        })
      })()}

      {/* Display sources if available */}
      {sources.length > 0 && message.role === "assistant" && !isStreaming && <MessageSources sources={sources} />}

      {/* Render file attachments if any */}
      {fileAttachments.length > 0 && (
        <div className={cn("mt-2", message.role === "user" ? "self-end max-w-[80%]" : "self-start w-full")}>
          <FileAttachmentViewer attachments={fileAttachments} />
        </div>
      )}

      {/* Display workflow execution details if available */}
      {workflowExecution && message.role === "assistant" && !isStreaming && (
        <div className="mt-2 space-y-2 w-full">
          <div className="bg-accent/50 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Workflow Execution
                </span>
              </div>
              <div className="flex items-center gap-1">
                {getWorkflowStatusIcon(workflowExecution.status)}
                <span className="text-xs capitalize text-primary">
                  {workflowExecution.status}
                </span>
              </div>
            </div>
            
            {workflowExecution.step_results && workflowExecution.step_results.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-primary">Steps:</span>
                <div className="space-y-1">
                  {workflowExecution.step_results.map((step, index) => (
                    <div key={step.step_id} className="flex items-center gap-2 text-xs">
                      {getWorkflowStatusIcon(step.status)}
                      <span className="text-primary">
                        Step {index + 1}: {step.status}
                      </span>
                      {step.error && (
                        <span className="text-red-500 text-xs truncate">
                          ({step.error})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Display artifact references if any */}
      {artifactReferences.length > 0 && message.role === "user" && (
        <div className={cn("mt-2 space-y-2", "self-end max-w-[80%]")}>
          <div className="flex flex-wrap gap-2">
            {artifactReferences.map((artifact: any, artifactIndex: number) => (
              <Badge
                key={`artifact-${artifact.id}-${artifactIndex}`}
                variant="outline"
                className="flex items-center gap-2 px-2 py-1 text-xs border-primary/20 bg-primary/5"
              >
                {getArtifactIcon(artifact.content_type)}
                <span className="max-w-[120px] truncate">{artifact.title}</span>
                {artifact.type === "insert" ? (
                  <Copy className="h-3 w-3 text-blue-500" />
                ) : (
                  <Plus className="h-3 w-3 text-green-500" />
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}



      {/* AI Context Menu - Only show if selection is within this message */}
      {selection && isSelectionInThisMessage() && (
        <AIContextMenu
          selectedText={selection.text}
          position={selection.position}
          onClose={clearSelection}
          onAction={handleAIAction}
          isProcessing={isAIProcessing}
        />
      )}

      {/* AI Action Result Dialog */}
      <AIActionResultDialog isOpen={showAIResult} onClose={closeAIResult} result={aiResult} onRetry={retryAction} />
    </div>
  )
}

const Message = memo(PureMessage, (prevProps, nextProps) => {
  if (prevProps.isStreaming !== nextProps.isStreaming) return false
  if (prevProps.message.id !== nextProps.message.id) return false
  if (prevProps.resumeComplete !== nextProps.resumeComplete) return false
  if (prevProps.resumedMessageId !== nextProps.resumedMessageId) return false
  if (prevProps.showThinking !== nextProps.showThinking) return false
  if (prevProps.isThinkingModel !== nextProps.isThinkingModel) return false
  if (prevProps.message.content !== nextProps.message.content) return false
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false
  if (prevProps.message.reasoning !== nextProps.message.reasoning) return false
  if (prevProps.message.workflowExecutionId !== nextProps.message.workflowExecutionId) return false
  if (prevProps.message.workflowId !== nextProps.message.workflowId) return false
  if (prevProps.message.workflowName !== nextProps.message.workflowName) return false
  return true
})

Message.displayName = "Message"

export default Message
