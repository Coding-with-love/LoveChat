"use client"

import type React from "react"
import { memo, useCallback, useMemo, useState } from "react"
import { Textarea } from "@/frontend/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Button } from "@/frontend/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/frontend/components/ui/tooltip"
import useAutoResizeTextarea from "@/hooks/useAutoResizeTextArea"
import type { UseChatHelpers } from "@ai-sdk/react"
import { useParams } from "react-router"
import { useNavigate } from "react-router"
import { createMessage, createThread } from "@/lib/supabase/queries"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useWebSearchStore } from "@/frontend/stores/WebSearchStore"
import { AI_MODELS, type AIModel, getModelConfig } from "@/lib/models"
import KeyPrompt from "@/frontend/components/KeyPrompt"
import type { UIMessage } from "ai"
import { v4 as uuidv4 } from "uuid"
import { StopIcon } from "./ui/icons"
import { toast } from "sonner"
import { useMessageSummary } from "../hooks/useMessageSummary"
import { useAuth } from "@/frontend/components/AuthProvider"
import FileUpload, { FilePreviewList } from "./FileUpload"
import type { FileUploadResult } from "@/lib/supabase/file-upload"
import { ChevronDown, Check, ArrowUpIcon, Search, Info, Bot } from 'lucide-react'
import { useKeyboardShortcuts } from "@/frontend/hooks/useKeyboardShortcuts"

interface ChatMessagePart {
  type: "text" | "file_attachments"
  content?: string
  attachments?: { fileName: string; content?: string }[]
}

interface ChatMessage {
  role: "user" | "assistant"
  content?: string
  parts?: ChatMessagePart[]
  experimental_attachments?: { name: string; contentType: string; content?: string }[]
}

interface ChatInputProps {
  threadId: string
  input: UseChatHelpers["input"]
  status: UseChatHelpers["status"]
  setInput: UseChatHelpers["setInput"]
  append: UseChatHelpers["append"]
  stop: UseChatHelpers["stop"]
}

interface StopButtonProps {
  stop: UseChatHelpers["stop"]
}

interface SendButtonProps {
  onSubmit: () => void
  disabled: boolean
}

const createUserMessage = (id: string, text: string): UIMessage => ({
  id,
  parts: [{ type: "text", text }],
  role: "user",
  content: text,
  createdAt: new Date(),
})

function PureChatInput({ threadId, input, status, setInput, append, stop }: ChatInputProps) {
  const { user } = useAuth()
  const getKey = useAPIKeyStore((state) => state.getKey)
  const selectedModel = useModelStore((state) => state.selectedModel)
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResult[]>([])
  const { enabled: webSearchEnabled, toggle: toggleWebSearch } = useWebSearchStore()

  // Check if we have an API key for the currently selected model
  const canChat = useMemo(() => {
    const modelConfig = getModelConfig(selectedModel)
    const apiKey = getKey(modelConfig.provider)
    const hasKey = modelConfig.provider === "ollama" ? true : !!apiKey

    console.log("🔍 Chat availability check:", {
      selectedModel,
      provider: modelConfig.provider,
      hasKey,
      keyLength: apiKey?.length || 0,
    })

    return hasKey
  }, [selectedModel, getKey])

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 200,
  })

  const navigate = useNavigate()
  const { id } = useParams()

  const isDisabled = useMemo(
    () => (!input.trim() && uploadedFiles.length === 0) || status === "streaming" || status === "submitted",
    [input, status, uploadedFiles.length],
  )

  const { complete, isAuthenticated } = useMessageSummary()

  // Check if current model supports search
  const currentModelSupportsSearch = useMemo(() => {
    const modelConfig = getModelConfig(selectedModel)
    return modelConfig.supportsSearch || false
  }, [selectedModel])

  const handleFileUpload = (files: FileUploadResult[]) => {
    setUploadedFiles(files)
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...prev]
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleWebSearchToggle = () => {
    if (!currentModelSupportsSearch && !webSearchEnabled) {
      toast.error("Current model doesn't support web search. Try Gemini 2.0 or Gemini 1.5 models.")
      return
    }
    toggleWebSearch()
    toast.success(webSearchEnabled ? "Web search disabled" : "Web search enabled")
  }

  const handleSubmit = useCallback(async () => {
    if (!user || !isAuthenticated) {
      toast.error("Please sign in to send messages")
      return
    }

    const currentInput = textareaRef.current?.value || input
    const hasText = currentInput.trim().length > 0
    const hasFiles = uploadedFiles.length > 0

    if ((!hasText && !hasFiles) || status === "streaming" || status === "submitted") return

    const messageId = uuidv4()

    try {
      console.log("🚀 Starting message submission:", {
        messageId,
        threadId,
        userId: user.id,
        isNewThread: !id,
        hasFiles,
        webSearchEnabled,
        modelSupportsSearch: currentModelSupportsSearch,
      })

      if (!id) {
        console.log("📝 Creating new thread...")
        navigate(`/chat/${threadId}`)
        await createThread(threadId)
        console.log("✅ Thread created successfully")

        console.log("📝 Generating thread title...")
        // Use the new completion API - don't await to avoid blocking
        complete(currentInput.trim() || "New chat with attachments", {
          body: { threadId, messageId, isTitle: true },
        }).catch((error) => {
          console.warn("⚠️ Failed to generate title (non-blocking):", error)
          // Don't show error toast for title generation failures
        })
      } else {
        console.log("📝 Generating message summary...")
        // Use the new completion API - don't await to avoid blocking
        complete(currentInput.trim() || `Shared ${uploadedFiles.length} file(s)`, {
          body: { messageId, threadId },
        }).catch((error) => {
          console.warn("⚠️ Failed to generate summary (non-blocking):", error)
          // Don't show error toast for summary generation failures
        })
      }

      // Enhanced file content processing with detailed logging
      console.log("🔍 Processing uploaded files:", {
        fileCount: uploadedFiles.length,
        files: uploadedFiles.map((f) => ({
          fileName: f.fileName,
          category: f.category,
          hasContent: !!f.content,
          contentLength: f.content?.length || 0,
          contentPreview: f.content?.substring(0, 100) + (f.content && f.content.length > 100 ? "..." : ""),
        })),
      })

      // Create the message content
      const messageContent = hasText ? currentInput.trim() : `Shared ${uploadedFiles.length} file(s)`

      // Create the base message using the helper
      const message = createUserMessage(messageId, messageContent)

      // Add file parts if there are files
      if (hasFiles) {
        await createMessage(threadId, message, uploadedFiles)
      } else {
        await createMessage(threadId, message)
      }

      // Send the message
      await append(message)

      // Clear input and files after successful send
      setInput("")
      setUploadedFiles([])
      adjustHeight()

      console.log("✅ Message sent successfully")
    } catch (error) {
      console.error("❌ Failed to send message:", error)
      toast.error("Failed to send message")
    }
  }, [
    user,
    isAuthenticated,
    textareaRef,
    input,
    uploadedFiles,
    status,
    threadId,
    id,
    webSearchEnabled,
    currentModelSupportsSearch,
    navigate,
    complete,
    append,
    setInput,
    adjustHeight,
  ])

  const handleClearInput = useCallback(() => {
    setInput("")
    setUploadedFiles([])
    adjustHeight()
  }, [setInput, adjustHeight])

  // Use keyboard shortcuts
  useKeyboardShortcuts({
    onSendMessage: handleSubmit,
    onClearInput: handleClearInput,
    onStopGenerating: status === "streaming" || status === "submitted" ? stop : undefined,
  })

  if (!canChat) {
    return <KeyPrompt />
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="fixed bottom-0 w-full max-w-3xl">
        <div className="bg-secondary rounded-t-[20px] p-4 w-full text-center">
          <p className="text-muted-foreground">Please sign in to start chatting</p>
        </div>
      </div>
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.metaKey || e.ctrlKey) {
        // Insert a new line when Command+Enter is pressed
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const value = textarea.value
        const newValue = value.substring(0, start) + "\n" + value.substring(end)
        
        // Update the input value
        setInput(newValue)
        
        // Focus needs to be maintained
        textarea.focus()
        
        // Set cursor position after the new line
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        })
        
        e.preventDefault()
      } else if (!e.shiftKey && !isDisabled) {
        // Submit when Enter is pressed without any modifiers
        e.preventDefault()
        // Clear input immediately before submission
        const currentInput = e.currentTarget.value
        setInput("")
        handleSubmit()
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    adjustHeight()
  }

  // Calculate dynamic height based on files
  const hasFiles = uploadedFiles.length > 0

  // Determine search status message
  const getSearchStatusMessage = () => {
    if (!webSearchEnabled) return null
    if (currentModelSupportsSearch) return "Web search enabled - real-time info available"
    return "Web search enabled but current model doesn't support it"
  }

  const searchStatusMessage = getSearchStatusMessage()

  return (
    <div className="fixed bottom-0 w-full max-w-3xl">
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-t-2xl shadow-2xl pb-0 w-full">
        {/* File preview area - appears above the input */}
        {hasFiles && (
          <div className="pt-4 px-4">
            <div className="bg-muted/50 rounded-xl p-3 border border-border/50">
              <FilePreviewList files={uploadedFiles} onRemoveFile={handleRemoveFile} />
            </div>
          </div>
        )}

        <div className="relative p-4">
          <div className="flex flex-col">
            <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
              <Textarea
                id="chat-input"
                value={input}
                placeholder={
                  uploadedFiles.length > 0
                    ? "Ask me anything about your files, or send them without additional text..."
                    : webSearchEnabled && currentModelSupportsSearch
                      ? "Ask anything - I'll search the web for current info..."
                      : webSearchEnabled && !currentModelSupportsSearch
                        ? "Web search enabled but current model doesn't support it..."
                        : "What can I do for you?"
                }
                className={cn(
                  "w-full px-4 py-4 border-none shadow-none bg-transparent",
                  "placeholder:text-muted-foreground/70 resize-none",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30",
                  "scrollbar-thumb-rounded-full text-base",
                  "min-h-[80px]",
                )}
                ref={textareaRef}
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
                aria-label="Chat message input"
                aria-describedby="chat-input-description"
              />
              <span id="chat-input-description" className="sr-only">
                Press Enter to send, Shift+Enter for new line
              </span>
            </div>

            <div className="h-16 flex items-center px-2 pt-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="bg-muted/50 rounded-lg p-1 border border-border/50">
                    <ChatModelDropdown />
                  </div>
                  <div className="flex items-center gap-2">
                    <FileUpload
                      threadId={threadId}
                      onFileUpload={handleFileUpload}
                      uploadedFiles={uploadedFiles}
                      onRemoveFile={handleRemoveFile}
                      disabled={status === "streaming" || status === "submitted"}
                    />

                    {/* Web Search Toggle */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={webSearchEnabled ? "default" : "ghost"}
                            size="icon"
                            onClick={handleWebSearchToggle}
                            className={cn(
                              "h-9 w-9 transition-all duration-200 rounded-lg",
                              webSearchEnabled &&
                                currentModelSupportsSearch &&
                                "bg-blue-500 hover:bg-blue-600 text-white shadow-md",
                              webSearchEnabled &&
                                !currentModelSupportsSearch &&
                                "bg-orange-500 hover:bg-orange-600 text-white shadow-md",
                              !webSearchEnabled && "hover:bg-muted border border-border/50",
                            )}
                            aria-label={webSearchEnabled ? "Disable web search" : "Enable web search"}
                            disabled={status === "streaming" || status === "submitted"}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <p className="font-medium">
                              {webSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}
                            </p>
                            {webSearchEnabled && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {currentModelSupportsSearch
                                  ? "Real-time search available"
                                  : "Current model doesn't support search"}
                              </p>
                            )}
                            {!webSearchEnabled && !currentModelSupportsSearch && (
                              <p className="text-xs text-muted-foreground mt-1">Try Gemini models for native search</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {status === "submitted" || status === "streaming" ? (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={stop}
                      aria-label="Stop generating response"
                      className="h-10 w-10 rounded-xl border-2 hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200"
                    >
                      <StopIcon size={20} />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      variant="default"
                      size="icon"
                      disabled={isDisabled}
                      aria-label="Send message"
                      className={cn(
                        "h-10 w-10 rounded-xl transition-all duration-200 shadow-md",
                        !isDisabled && "hover:scale-105 hover:shadow-lg",
                        isDisabled && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <ArrowUpIcon size={18} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Web Search Status Indicator */}
      {searchStatusMessage && (
        <div className="absolute -top-16 left-4 right-4 flex items-center justify-center">
          <div
            className={cn(
              "text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border backdrop-blur-sm",
              "animate-in slide-in-from-bottom-2 duration-300",
              currentModelSupportsSearch
                ? "bg-blue-500/90 border-blue-400/50"
                : "bg-orange-500/90 border-orange-400/50",
            )}
          >
            <div className="flex items-center gap-2">
              <Search className="h-3 w-3" />
              <span className="font-medium">{searchStatusMessage}</span>
              {!currentModelSupportsSearch && <Info className="h-3 w-3" />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ChatInput = memo(PureChatInput, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false
  if (prevProps.status !== nextProps.status) return false
  return true
})

const PureChatModelDropdown = () => {
  const getKey = useAPIKeyStore((state) => state.getKey)
  const { selectedModel, setModel, customModels } = useModelStore()

  const isModelEnabled = useCallback(
    (model: AIModel) => {
      const modelConfig = getModelConfig(model)
      const apiKey = getKey(modelConfig.provider)
      return modelConfig.provider === "ollama" ? true : !!apiKey
    },
    [getKey],
  )

  const getModelIcon = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    if (modelConfig.supportsSearch) {
      return <Search className="w-3 h-3 text-blue-500" />
    }
    if (modelConfig.provider === "ollama") {
      return <Bot className="w-3 h-3 text-green-500" />
    }
    return null
  }, [])

  // Combine standard and custom models
  const allModels = useMemo(() => {
    return [...AI_MODELS, ...customModels]
  }, [customModels])

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-8 px-3 text-sm rounded-md text-foreground hover:bg-primary/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary transition-all duration-200"
            aria-label={`Selected model: ${selectedModel}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{selectedModel}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={cn("min-w-[10rem]", "border-border", "bg-popover")}>
          {/* Standard Models */}
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Standard Models
          </DropdownMenuItem>
          {AI_MODELS.map((model) => {
            const isEnabled = isModelEnabled(model)
            const modelIcon = getModelIcon(model)
            return (
              <DropdownMenuItem
                key={model}
                onSelect={() => isEnabled && setModel(model)}
                disabled={!isEnabled}
                className={cn("flex items-center justify-between gap-2", "cursor-pointer")}
              >
                <div className="flex items-center gap-2">
                  <span>{model}</span>
                  {modelIcon}
                </div>
                {selectedModel === model && <Check className="w-4 h-4 text-blue-500" aria-label="Selected" />}
              </DropdownMenuItem>
            )
          })}

          {/* Ollama Models */}
          {customModels.length > 0 && (
            <>
              <DropdownMenuItem disabled className="text-xs text-muted-foreground mt-2">
                Ollama Models
              </DropdownMenuItem>
              {customModels.map((model) => {
                const modelName = model.replace("ollama:", "")
                const modelIcon = getModelIcon(model)
                return (
                  <DropdownMenuItem
                    key={model}
                    onSelect={() => setModel(model)}
                    className={cn("flex items-center justify-between gap-2", "cursor-pointer")}
                  >
                    <div className="flex items-center gap-2">
                      <span>{modelName}</span>
                      {modelIcon}
                    </div>
                    {selectedModel === model && <Check className="w-4 h-4 text-blue-500" aria-label="Selected" />}
                  </DropdownMenuItem>
                )
              })}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const ChatModelDropdown = memo(PureChatModelDropdown)

const PureStopButton = ({ stop }: StopButtonProps) => {
  return (
    <Button variant="outline" size="icon" onClick={stop} aria-label="Stop generating response">
      <StopIcon size={20} />
    </Button>
  )
}

const StopButton = memo(PureStopButton)

const PureSendButton = ({ onSubmit, disabled }: SendButtonProps) => {
  return (
    <Button onClick={onSubmit} variant="default" size="icon" disabled={disabled} aria-label="Send message">
      <ArrowUpIcon size={18} />
    </Button>
  )
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled
})

export default ChatInput
