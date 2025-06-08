"use client"

import type React from "react"

import { ChevronDown, Check, ArrowUpIcon, Search, Info } from "lucide-react"
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
  const canChat = useAPIKeyStore((state) => state.hasRequiredKeys())
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResult[]>([])
  const { enabled: webSearchEnabled, toggle: toggleWebSearch } = useWebSearchStore()
  const selectedModel = useModelStore((state) => state.selectedModel)

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
        // Use the new completion API
        complete(currentInput.trim() || "New chat with attachments", {
          body: { threadId, messageId, isTitle: true },
        }).catch((error) => {
          console.error("Failed to generate title:", error)
          // Don't block the message sending if title generation fails
        })
      } else {
        console.log("📝 Generating message summary...")
        // Use the new completion API
        complete(currentInput.trim() || `Shared ${uploadedFiles.length} file(s)`, {
          body: { messageId, threadId },
        }).catch((error) => {
          console.error("Failed to generate summary:", error)
          // Don't block the message sending if summary generation fails
        })
      }

      // Create message content based on what we have
      let messageContent = currentInput.trim()
      if (!messageContent && hasFiles) {
        const fileTypes = uploadedFiles.map((f) => f.category).filter((v, i, a) => a.indexOf(v) === i)
        const fileTypeText = fileTypes.length === 1 ? fileTypes[0] : "file"
        messageContent = `Shared ${uploadedFiles.length} ${fileTypeText}${uploadedFiles.length > 1 ? "s" : ""}`
      }

      const userMessage = createUserMessage(messageId, messageContent)
      console.log("📝 Creating user message with attachments:", uploadedFiles.length)
      await createMessage(threadId, userMessage, uploadedFiles)
      console.log("✅ User message created successfully")

      console.log("📝 Appending message to chat...")
      // Update the message parts to include file attachments
      const messageWithAttachments = {
        ...userMessage,
        parts: [
          ...userMessage.parts,
          ...(uploadedFiles.length > 0
            ? [
                {
                  type: "file_attachments" as const,
                  attachments: uploadedFiles,
                },
              ]
            : []),
        ],
      }

      append(messageWithAttachments)
      setInput("")
      setUploadedFiles([])
      adjustHeight(true)
      console.log("✅ Message submission completed")
    } catch (error) {
      console.error("❌ Failed to submit message:", error)
      toast.error("Failed to send message")
    }
  }, [
    input,
    status,
    setInput,
    adjustHeight,
    append,
    id,
    textareaRef,
    threadId,
    complete,
    navigate,
    user,
    isAuthenticated,
    uploadedFiles,
    webSearchEnabled,
    currentModelSupportsSearch,
  ])

  if (!canChat) {
    return <KeyPrompt />
  }

  if (!user) {
    return (
      <div className="fixed bottom-0 w-full max-w-3xl">
        <div className="bg-secondary rounded-t-[20px] p-4 w-full text-center">
          <p className="text-muted-foreground">Please sign in to start chatting</p>
        </div>
      </div>
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
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
      <div className="bg-secondary rounded-t-[20px] pb-0 w-full">
        {/* File preview area - appears above the input */}
        {hasFiles && (
          <div className="pt-2">
            <FilePreviewList files={uploadedFiles} onRemoveFile={handleRemoveFile} />
          </div>
        )}

        <div className="relative p-2">
          <div className="flex flex-col">
            <div className="bg-secondary overflow-y-auto max-h-[300px]">
              <Textarea
                id="chat-input"
                value={input}
                placeholder={
                  uploadedFiles.length > 0
                    ? "Add a message or send files without text..."
                    : webSearchEnabled && currentModelSupportsSearch
                      ? "Ask anything - I'll search the web for current info..."
                      : webSearchEnabled && !currentModelSupportsSearch
                        ? "Web search enabled but current model doesn't support it..."
                        : "What can I do for you?"
                }
                className={cn(
                  "w-full px-4 py-3 border-none shadow-none dark:bg-transparent",
                  "placeholder:text-muted-foreground resize-none",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30",
                  "scrollbar-thumb-rounded-full",
                  "min-h-[72px]",
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

            <div className="h-14 flex items-center px-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <ChatModelDropdown />
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
                            "h-8 w-8 transition-all",
                            webSearchEnabled &&
                              currentModelSupportsSearch &&
                              "bg-blue-500 hover:bg-blue-600 text-white",
                            webSearchEnabled &&
                              !currentModelSupportsSearch &&
                              "bg-orange-500 hover:bg-orange-600 text-white",
                          )}
                          aria-label={webSearchEnabled ? "Disable web search" : "Enable web search"}
                          disabled={status === "streaming" || status === "submitted"}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <p className="font-medium">{webSearchEnabled ? "Web Search Enabled" : "Enable Web Search"}</p>
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

                {status === "submitted" || status === "streaming" ? (
                  <StopButton stop={stop} />
                ) : (
                  <SendButton onSubmit={handleSubmit} disabled={isDisabled} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Web Search Status Indicator */}
      {searchStatusMessage && (
        <div className="absolute -top-12 left-4 right-4 flex items-center justify-center">
          <div
            className={cn(
              "text-white text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border-2",
              currentModelSupportsSearch ? "bg-blue-500 border-blue-400" : "bg-orange-500 border-orange-400",
            )}
          >
            <div className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              {/* Globe2 icon removed to avoid redeclaration */}
            </div>
            <span className="font-medium">{searchStatusMessage}</span>
            {!currentModelSupportsSearch && <Info className="h-3 w-3" />}
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
  const { selectedModel, setModel } = useModelStore()

  const isModelEnabled = useCallback(
    (model: AIModel) => {
      const modelConfig = getModelConfig(model)
      const apiKey = getKey(modelConfig.provider)
      return !!apiKey
    },
    [getKey],
  )

  const getModelIcon = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    if (modelConfig.supportsSearch) {
      return <Search className="w-3 h-3 text-blue-500" />
    }
    return null
  }, [])

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1 h-8 pl-2 pr-2 text-xs rounded-md text-foreground hover:bg-primary/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
            aria-label={`Selected model: ${selectedModel}`}
          >
            <div className="flex items-center gap-1">
              {selectedModel}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={cn("min-w-[10rem]", "border-border", "bg-popover")}>
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const ChatModelDropdown = memo(PureChatModelDropdown)

function PureStopButton({ stop }: StopButtonProps) {
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
