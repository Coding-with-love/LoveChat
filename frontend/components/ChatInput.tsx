"use client"

import type React from "react"
import { memo, useCallback, useMemo, useState, useEffect } from "react"
import { Textarea } from "@/frontend/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Button } from "@/frontend/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/frontend/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/frontend/components/ui/tooltip"
import useAutoResizeTextarea from "@/hooks/useAutoResizeTextArea"
import type { UseChatHelpers } from "@ai-sdk/react"
import { useParams } from "react-router"
import { useNavigate } from "react-router"
import { createMessage, createThread } from "@/lib/supabase/queries"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { useModelStore } from "@/frontend/stores/ModelStore"
import { useWebSearchStore } from "@/frontend/stores/WebSearchStore"
import { type AIModel, getModelConfig } from "@/lib/models"
import KeyPrompt from "@/frontend/components/KeyPrompt"
import type { UIMessage } from "ai"
import { v4 as uuidv4 } from "uuid"
import { StopIcon } from "./ui/icons"
import { toast } from "sonner"
import { useMessageSummary } from "../hooks/useMessageSummary"
import { useAuth } from "@/frontend/components/AuthProvider"
import FileUpload, { FilePreviewList } from "./FileUpload"
import type { FileUploadResult } from "@/lib/supabase/file-upload"
import {
  ChevronDown,
  ArrowUpIcon,
  Search,
  Info,
  Settings,
  Sparkles,
  Archive,
  X,
  Code,
  FileText,
  Copy,
  Plus,
  Loader2,
  Zap,
  Wrench,
  User,
  Upload,
} from "lucide-react"
import { useKeyboardShortcuts } from "@/frontend/hooks/useKeyboardShortcuts"
import PersonaTemplateSelector from "./PersonaTemplateSelector"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CreatePersonaDialog } from "./CreatePersonaDialog"
import { CreateTemplateDialog } from "./CreateTemplateDialog"
import { useThreadPersona } from "@/frontend/hooks/useThreadPersona"
import { EditPersonaDialog } from "./EditPersonaDialog"
import { EditTemplateDialog } from "./EditTemplateDialog"
import type { Persona } from "@/lib/supabase/types"
import type { PromptTemplate } from "@/frontend/stores/PersonaStore"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"
import { usePersonas } from "@/frontend/hooks/usePersonas"
import { useUserPreferencesStore } from "@/frontend/stores/UserPreferencesStore"
import { ArtifactPicker } from "./ArtifactPicker"
import type { Artifact } from "@/frontend/stores/ArtifactStore"
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import { Badge } from "@/frontend/components/ui/badge"
import { CrossChatArtifactIndicator } from "./CrossChatArtifactIndicator"
import { ProviderLogo } from "@/frontend/components/ProviderLogo"
import { useSidebar } from "@/frontend/components/ui/sidebar"
import { WorkflowBuilder } from "./WorkflowBuilder"
import { ReasoningEffortSelector } from "./ReasoningEffortSelector"

interface ChatMessagePart {
  type: "text" | "file_attachments" | "artifact_references"
  content?: string
  attachments?: { fileName: string; content?: string }[]
  artifacts?: Array<{
    id: string
    title: string
    type: "reference" | "insert"
    content_type: string
  }>
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
  onRefreshMessages?: () => void
}

interface StopButtonProps {
  stop: UseChatHelpers["stop"]
}

interface SendButtonProps {
  onSubmit: () => void
  disabled: boolean
}

interface ArtifactReference {
  id: string
  artifact: Artifact
  type: "reference" | "insert"
}

const createUserMessage = (id: string, text: string): UIMessage => ({
  id,
  parts: [{ type: "text", text }],
  role: "user",
  content: text,
  createdAt: new Date(),
})

function PureChatInput({ threadId, input, status, setInput, append, stop, onRefreshMessages }: ChatInputProps) {
  const { user } = useAuth()
  const getKey = useAPIKeyStore((state) => state.getKey)
  const { selectedModel, setModel, getEnabledModels, ensureValidSelectedModel } = useModelStore()
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResult[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { enabled: webSearchEnabled, toggle: toggleWebSearch } = useWebSearchStore()
  const [createPersonaOpen, setCreatePersonaOpen] = useState(false)
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false)
  const [editPersonaOpen, setEditPersonaOpen] = useState(false)
  const [editTemplateOpen, setEditTemplateOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [workflowBuilderOpen, setWorkflowBuilderOpen] = useState(false)
  const [reasoningEffort, setReasoningEffort] = useState<"low" | "medium" | "high">("medium")
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false)
  const [artifactPickerOpen, setArtifactPickerOpen] = useState(false)

  // Get sidebar state for responsive positioning
  const { state: sidebarState, isMobile } = useSidebar()
  const sidebarCollapsed = sidebarState === "collapsed"

  // Artifact references state
  const [artifactReferences, setArtifactReferences] = useState<ArtifactReference[]>([])

  // Get user preferences for chat
  const userPreferences = useUserPreferencesStore()

  // Delete confirmation states
  const [deletePersonaOpen, setDeletePersonaOpen] = useState(false)
  const [deleteTemplateOpen, setDeleteTemplateOpen] = useState(false)
  const [deletingPersona, setDeletingPersona] = useState<Persona | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<PromptTemplate | null>(null)

  // Ensure the selected model is valid on component mount
  useEffect(() => {
    // Only ensure valid model if not currently loading API keys
    const apiKeyStore = useAPIKeyStore.getState()
    if (!apiKeyStore.isLoading) {
      ensureValidSelectedModel()
    }
  }, [ensureValidSelectedModel])

  // Listen for artifact reference events from ArtifactCard components
  useEffect(() => {
    const handleArtifactReference = (event: CustomEvent) => {
      const { reference } = event.detail
      if (textareaRef.current) {
        const textarea = textareaRef.current
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentValue = textarea.value

        const newValue = currentValue.slice(0, start) + reference + currentValue.slice(end)
        setInput(newValue)

        // Set cursor position after the inserted reference
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + reference.length, start + reference.length)
          adjustHeight()
        }, 0)
      }
    }

    window.addEventListener("artifactReference", handleArtifactReference as EventListener)

    return () => {
      window.removeEventListener("artifactReference", handleArtifactReference as EventListener)
    }
  }, [setInput])

  // Get enabled models that have API keys
  const enabledModels = useMemo(() => {
    return getEnabledModels()
  }, [getEnabledModels])

  // Ensure artifacts are loaded for cross-chat referencing
  const { fetchArtifacts } = useArtifactStore()
  useEffect(() => {
    // Fetch all artifacts when the component mounts to ensure they're available for referencing
    fetchArtifacts()
  }, [fetchArtifacts])

  // Chat is always available with server fallback keys
  const canChat = useMemo(() => {
    return true // Server has fallback API keys, so chat is always available
  }, [])

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 200,
  })

  const navigate = useNavigate()
  const { id } = useParams()

  const isDisabled = useMemo(
    () =>
      (!(typeof input === "string" ? input.trim() : input) &&
        uploadedFiles.length === 0 &&
        artifactReferences.length === 0) ||
      status === "streaming" ||
      status === "submitted" ||
      isUploading,
    [input, status, uploadedFiles.length, artifactReferences.length, isUploading],
  )

  const { complete, isAuthenticated } = useMessageSummary()

  // Check if current model supports search
  const currentModelSupportsSearch = useMemo(() => {
    const modelConfig = getModelConfig(selectedModel)
    return modelConfig.supportsSearch || false
  }, [selectedModel])

  // Check if current model is an OpenAI reasoning model
  const isOpenAIReasoningModel = useMemo(() => {
    const modelConfig = getModelConfig(selectedModel)
    return modelConfig.provider === "openai" && modelConfig.supportsThinking
  }, [selectedModel])

  // Auto-disable web search when switching to a model that doesn't support it
  useEffect(() => {
    if (!currentModelSupportsSearch && webSearchEnabled) {
      toggleWebSearch()
      toast.info("Web search disabled - current model doesn't support web search")
    }
  }, [currentModelSupportsSearch, webSearchEnabled, toggleWebSearch])

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

  const { currentPersona } = useThreadPersona(threadId)
  const { deletePersona, deleteTemplate } = usePersonas()

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona)
    setEditPersonaOpen(true)
  }

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template)
    setEditTemplateOpen(true)
  }

  const handleTemplateSelect = (template: any) => {
    // Handle both old string format and new PromptTemplate object format
    const templateContent = typeof template === "string" ? template : template.template

    // If there's existing input, append the template with a newline
    const currentInput = typeof input === "string" ? input : ""
    const newInput = currentInput ? `${currentInput}\n\n${templateContent}` : templateContent
    setInput(newInput)
    adjustHeight()

    // Focus the textarea after a short delay to ensure the content is set
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  const handleDeletePersona = (persona: Persona) => {
    setDeletingPersona(persona)
    setDeletePersonaOpen(true)
  }

  const handleDeleteTemplate = (template: PromptTemplate) => {
    setDeletingTemplate(template)
    setDeleteTemplateOpen(true)
  }

  const confirmDeletePersona = async () => {
    if (!deletingPersona) return

    try {
      await deletePersona(deletingPersona.id)
      setDeletePersonaOpen(false)
      setDeletingPersona(null)
    } catch (error) {
      // Error handling is done in the deletePersona function
    }
  }

  const confirmDeleteTemplate = async () => {
    if (!deletingTemplate) return

    try {
      await deleteTemplate(deletingTemplate.id)
      setDeleteTemplateOpen(false)
      setDeletingTemplate(null)
    } catch (error) {
      // Error handling is done in the deleteTemplate function
    }
  }

  // Enhanced artifact picker handler with badge system
  const handleArtifactSelect = (artifact: Artifact, action: "reference" | "insert" | "view") => {
    switch (action) {
      case "reference":
      case "insert":
        // Check if artifact is already referenced
        const existingRef = artifactReferences.find((ref) => ref.artifact.id === artifact.id)
        if (existingRef) {
          toast.info(
            `Artifact "${artifact.title}" is already ${existingRef.type === "reference" ? "referenced" : "inserted"}`,
          )
          return
        }

        // Add artifact reference as a badge
        const newRef: ArtifactReference = {
          id: uuidv4(),
          artifact,
          type: action,
        }
        setArtifactReferences((prev) => [...prev, newRef])
        toast.success(`${action === "reference" ? "Referenced" : "Inserted"} artifact "${artifact.title}"`)
        break

      case "view":
        // Navigate to artifacts gallery with this artifact highlighted
        window.location.href = `/artifacts?highlight=${artifact.id}`
        toast.success(`Viewing artifact: ${artifact.title}`)
        break
    }
  }

  // Remove artifact reference
  const handleRemoveArtifactReference = (refId: string) => {
    setArtifactReferences((prev) => prev.filter((ref) => ref.id !== refId))
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

  const handleSubmit = useCallback(async () => {
    console.log("🚀 ChatInput handleSubmit called", {
      user: !!user,
      isAuthenticated,
      textareaValue: textareaRef.current?.value,
      inputState: input,
      status,
      hasFiles: uploadedFiles.length > 0,
      hasArtifacts: artifactReferences.length > 0,
    })

    if (!user || !isAuthenticated) {
      toast.error("Please sign in to send messages")
      return
    }

    const currentInput = textareaRef.current?.value || (typeof input === "string" ? input : "")
    const hasText = typeof currentInput === "string" && currentInput.trim().length > 0
    const hasFiles = uploadedFiles.length > 0
    const hasArtifacts = artifactReferences.length > 0

    console.log("📝 Message content check:", {
      currentInput: currentInput.substring(0, 100),
      hasText,
      hasFiles,
      hasArtifacts,
      status,
      willProceed: !(!hasText && !hasFiles && !hasArtifacts) && status !== "streaming" && status !== "submitted",
    })

    if ((!hasText && !hasFiles && !hasArtifacts) || status === "streaming" || status === "submitted") return

    const messageId = uuidv4()

    try {
      console.log("🚀 Starting message submission:", {
        messageId,
        threadId,
        userId: user.id,
        isNewThread: !id,
        hasFiles,
        hasArtifacts,
        artifactCount: artifactReferences.length,
        webSearchEnabled,
        modelSupportsSearch: currentModelSupportsSearch,
        personaActive: !!currentPersona,
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

      // Create the message content - just the text input for display
      let messageContent = hasText ? currentInput.trim() : ""

      if (!messageContent && hasFiles && !hasArtifacts) {
        messageContent = `Shared ${uploadedFiles.length} file(s)`
      }

      if (!messageContent && !hasFiles && hasArtifacts) {
        messageContent = "Shared artifacts"
      }

      // Create the base message using the helper - this is what the user sees
      const displayMessage = createUserMessage(messageId, messageContent)

      // Add artifact references as a separate part for display
      if (hasArtifacts) {
        if (!displayMessage.parts) {
          displayMessage.parts = []
        }
        ;(displayMessage.parts as any).push({
          type: "artifact_references",
          artifacts: artifactReferences.map((ref) => ({
            id: ref.artifact.id,
            title: ref.artifact.title,
            type: ref.type,
            content_type: ref.artifact.content_type,
          })),
        })
      }

      // Create a separate message for the API with technical tags
      let apiMessageContent = hasText ? currentInput.trim() : ""
      if (hasArtifacts) {
        const artifactTags = artifactReferences
          .map((ref) => `@artifact[${ref.artifact.id}${ref.type === "insert" ? ":insert" : ""}]`)
          .join(" ")
        apiMessageContent = apiMessageContent ? `${apiMessageContent} ${artifactTags}` : artifactTags
      }

      if (!apiMessageContent && hasFiles) {
        apiMessageContent = `Shared ${uploadedFiles.length} file(s)`
      }

      // Create API message with technical tags for the AI - this will include file attachments for UI display
      const apiMessage = createUserMessage(messageId + "_api", apiMessageContent)

      // Add file attachments to the API message for immediate UI display
      if (hasFiles) {
        console.log("📎 Adding file attachments to message:", uploadedFiles.length)

        if (!apiMessage.parts) {
          apiMessage.parts = []
        }
        ;(apiMessage.parts as any).push({
          type: "file_attachments",
          attachments: uploadedFiles.map((file) => ({
            id: file.id,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            fileUrl: file.fileUrl || file.url,
            thumbnailUrl: file.thumbnailUrl,
            content: file.content,
            extractedText: file.extractedText,
            category: file.category,
          })),
        })

        // Create database message with file attachments
        await createMessage(threadId, displayMessage, uploadedFiles)
      } else {
        // Create database message without file attachments
        await createMessage(threadId, displayMessage)
      }

      // Include user preferences in the data sent to the API
      const userPrefsToSend = {
        preferredName: userPreferences.preferredName,
        occupation: userPreferences.occupation,
        assistantTraits: userPreferences.assistantTraits,
        customInstructions: userPreferences.customInstructions,
      }

      // Convert image files to experimental_attachments for vision models
      const experimentalAttachments = uploadedFiles
        .filter((file) => file.fileType.startsWith("image/") && (file.fileUrl || file.url))
        .map((file) => ({
          name: file.fileName,
          contentType: file.fileType,
          url: file.fileUrl || file.url!, // Use the file URL for images
        }))

      console.log("🖼️ Image attachments for AI vision:", {
        imageCount: experimentalAttachments.length,
        images: experimentalAttachments.map((img) => ({
          name: img.name,
          contentType: img.contentType,
          hasUrl: !!img.url,
        })),
      })

      const result = await append(apiMessage, {
        experimental_attachments: experimentalAttachments.length > 0 ? experimentalAttachments : undefined,
        data: {
          userPreferences: userPrefsToSend,
          ...(isOpenAIReasoningModel && { reasoningEffort }),
        },
      })

      console.log("📤 append() returned:", result)

      // Only clear input, files, and artifact references after successful send AND append
      setInput("")
      setUploadedFiles([])
      setArtifactReferences([])
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
    artifactReferences,
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
    currentPersona,
    userPreferences,
    isOpenAIReasoningModel,
    reasoningEffort,
  ])

  const handleClearInput = useCallback(() => {
    setInput("")
    setUploadedFiles([])
    setArtifactReferences([])
    adjustHeight()
  }, [setInput, adjustHeight])

  // Use keyboard shortcuts
  useKeyboardShortcuts({
    onSendMessage: handleSubmit,
    onClearInput: handleClearInput,
    onStopGenerating: status === "streaming" || status === "submitted" ? stop : undefined,
  })

  // Simplified compact tools dropdown
  const ToolsDropdown = () => (
    <DropdownMenuContent className="w-64 p-0" align="center">
      <div className="p-3 border-b border-border/30">
        <h3 className="font-medium text-sm text-foreground">Advanced Tools</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Artifacts, workflows, and automation</p>
      </div>
      
      <div className="p-2 space-y-1">
        {/* Artifact Picker */}
        <Button
          variant="ghost"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-all duration-200 cursor-pointer w-full group h-auto justify-start"
          onClick={(e) => {
            e.stopPropagation() // Prevent dropdown from closing
            setArtifactPickerOpen(true)
            setToolsDropdownOpen(false)
          }}
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 group-hover:bg-purple-500/20 transition-colors">
            <Archive className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium text-sm text-foreground">Artifacts</div>
            <div className="text-xs text-muted-foreground">Insert code & documents</div>
          </div>
        </Button>

        {/* Workflow Builder */}
        <div 
          className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-all duration-200 cursor-pointer"
          onClick={() => {
            setWorkflowBuilderOpen(true)
            setToolsDropdownOpen(false)
          }}
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20 transition-colors">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-foreground">Workflows</div>
            <div className="text-xs text-muted-foreground">Automate AI tasks</div>
          </div>
        </div>

        {/* Cross-Chat Reference */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-all duration-200">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-green-500/10 text-green-600">
            <Archive className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-foreground flex items-center gap-2">
              Cross-Chat
              <CrossChatArtifactIndicator currentThreadId={threadId} />
            </div>
            <div className="text-xs text-muted-foreground">Reference other conversations</div>
          </div>
        </div>
      </div>
    </DropdownMenuContent>
  )

  if (!canChat) {
    return <KeyPrompt />
  }

  if (!user || !isAuthenticated) {
    return (
      <div
        className={cn(
          "fixed bottom-0 w-full max-w-3xl",
          // Smooth animations with easing
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          // Mobile: always centered with padding
          "px-4 md:px-0",
          // Desktop: adjust position based on sidebar state
          isMobile
            ? "left-1/2 transform -translate-x-1/2"
            : sidebarCollapsed
              ? "left-1/2 transform -translate-x-1/2"
              : "left-[calc(var(--sidebar-width)+1rem)] right-4 transform-none max-w-none w-[calc(100vw-var(--sidebar-width)-2rem)]",
        )}
      >
        <div className="bg-secondary rounded-t-[20px] p-4 w-full max-w-3xl mx-auto text-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
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
        console.log("⌨️ Enter pressed, submitting message:", {
          currentInput: currentInput.substring(0, 100),
          isDisabled,
          status,
        })
        setInput("")
        handleSubmit()
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    adjustHeight()
  }

  // Calculate dynamic height based on files and artifacts
  const hasFiles = uploadedFiles.length > 0
  const hasArtifacts = artifactReferences.length > 0

  // Determine search status message
  const getSearchStatusMessage = () => {
    if (!webSearchEnabled) return null
    if (currentModelSupportsSearch) return "Web search enabled - real-time info available"
    return "Web search enabled but current model doesn't support it"
  }

  const searchStatusMessage = getSearchStatusMessage()

  // Helper function for mobile layout
  const getModelIcon = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    return <ProviderLogo provider={modelConfig.provider} size="sm" />
  }, [])

  return (
    <div
      className={cn(
        "fixed bottom-0 w-full max-w-4xl",
        // Smooth animations with easing
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        // Mobile: always centered with padding
        "px-3 md:px-4",
        // Desktop: adjust position based on sidebar state
        isMobile
          ? "left-1/2 transform -translate-x-1/2"
          : sidebarCollapsed
            ? "left-1/2 transform -translate-x-1/2"
            : "left-[calc(var(--sidebar-width)+1rem)] right-4 transform-none max-w-none w-[calc(100vw-var(--sidebar-width)-2rem)]",
      )}
    >
      <div className="bg-white/98 dark:bg-background/95 backdrop-blur-xl border-t border-l border-r border-border rounded-t-3xl shadow-[0_-20px_25px_-5px_rgba(0,0,0,0.1),0_-10px_10px_-5px_rgba(0,0,0,0.04)] dark:shadow-[0_-20px_25px_-5px_rgba(0,0,0,0.25),0_-10px_10px_-5px_rgba(0,0,0,0.1)] pb-2 w-full max-w-4xl mx-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative">
        {/* Active Persona Indicator - only show for non-default personas */}
        {currentPersona && !currentPersona.is_default && (
          <div className="px-6 pt-4">
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-sm">{currentPersona.avatar_emoji}</span>
              <span className="text-sm font-medium text-primary">{currentPersona.name} is active</span>
              <span className="text-xs text-muted-foreground ml-auto">System prompt enhanced</span>
            </div>
          </div>
        )}

        {/* Artifact References - appears above the input */}
        {hasArtifacts && (
          <div className="pt-4 px-4">
            <div className="bg-muted/50 rounded-xl p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Referenced Artifacts</span>
                {artifactReferences.some((ref) => ref.artifact.thread_id !== threadId) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-primary">
                          <Archive className="h-3 w-3" />
                          <span className="text-xs">Cross-Chat</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Some artifacts are from other conversations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {artifactReferences.map((ref) => {
                  const isCrossChat = ref.artifact.thread_id !== threadId
                  return (
                    <Badge
                      key={ref.id}
                      variant="secondary"
                      className={cn(
                        "flex items-center gap-2 pr-1 pl-2 py-1 text-xs",
                        isCrossChat && "border-accent bg-accent/20 dark:border-accent dark:bg-accent/10",
                      )}
                    >
                      {getArtifactIcon(ref.artifact.content_type)}
                      <span className="max-w-[120px] truncate">{ref.artifact.title}</span>
                      {isCrossChat && <Archive className="h-2 w-2 text-primary" />}
                      {ref.type === "insert" ? (
                        <Copy className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Plus className="h-3 w-3 text-green-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={() => handleRemoveArtifactReference(ref.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* File preview area - appears above the input */}
        {hasFiles && (
          <div className="pt-4 px-6">
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
              <FilePreviewList files={uploadedFiles} onRemoveFile={handleRemoveFile} />
            </div>
          </div>
        )}

        <div className="relative p-6 pb-4">
          <div className="flex flex-col">
            <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
              <Textarea
                id="chat-input"
                value={input}
                placeholder={
                  isUploading
                    ? "Uploading files..."
                    : currentPersona
                      ? `Ask ${currentPersona.name} anything...`
                      : uploadedFiles.length > 0 || artifactReferences.length > 0
                        ? "Ask me anything about your files or artifacts, or send them without additional text..."
                        : webSearchEnabled && currentModelSupportsSearch
                          ? "Ask anything - I'll search the web for current info..."
                          : webSearchEnabled && !currentModelSupportsSearch
                            ? "Web search enabled but current model doesn't support it..."
                            : "What can I do for you?"
                }
                className={cn(
                  "w-full px-4 py-3 border-none shadow-none bg-transparent",
                  "placeholder:text-muted-foreground/70 resize-none",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30",
                  "scrollbar-thumb-rounded-full text-base",
                  "min-h-[60px]",
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

            {/* Integrated Toolbar */}
            {/* Desktop/Tablet Layout */}
            <div className="hidden sm:flex items-center justify-between px-6 py-2 border-t border-border/30">
              {/* Left Group - Model Selector */}
              <div className="flex items-center">
                <div className="bg-muted/60 dark:bg-muted/40 rounded-xl px-3 py-2 border border-border/50 max-w-full overflow-hidden">
                  <ChatModelDropdown />
                  {isOpenAIReasoningModel && (
                    <>
                      <div className="w-px h-4 bg-border/50 mx-2" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                            disabled={status === "streaming" || status === "submitted"}
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 p-2" align="start">
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/50 mb-2">
                            Model Settings
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                Reasoning Effort
                              </label>
                              <ReasoningEffortSelector
                                value={reasoningEffort}
                                onChange={setReasoningEffort}
                                disabled={status === "streaming" || status === "submitted"}
                              />
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>

              {/* Right Group - All Tools and Actions */}
              <div className="flex items-center">
                    {/* File Upload */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <FileUpload
                            threadId={threadId}
                            onFileUpload={handleFileUpload}
                            uploadedFiles={uploadedFiles}
                            onRemoveFile={handleRemoveFile}
                            onUploadingChange={setIsUploading}
                            disabled={status === "streaming" || status === "submitted"}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Upload files</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="w-px h-4 bg-border/50 mx-2" />

                    {/* Advanced Tools */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenu open={toolsDropdownOpen} onOpenChange={setToolsDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105"
                                disabled={status === "streaming" || status === "submitted"}
                              >
                                <Wrench className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <ToolsDropdown />
                          </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Advanced Tools</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="w-px h-4 bg-border/50 mx-2" />

                    {/* Persona Selector */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-7 w-7 rounded-lg transition-all duration-200 hover:scale-105",
                                  currentPersona && !currentPersona.is_default
                                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                                    : "hover:bg-muted/30 text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {currentPersona && !currentPersona.is_default ? (
                                  <span className="text-xs">{currentPersona.avatar_emoji}</span>
                                ) : (
                                  <User className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="end">
                              <PersonaTemplateSelector
                                threadId={threadId}
                                onPersonaSelect={(persona) => {}}
                                onTemplateSelect={handleTemplateSelect}
                                onCreatePersona={() => setCreatePersonaOpen(true)}
                                onCreateTemplate={() => setCreateTemplateOpen(true)}
                                onEditPersona={handleEditPersona}
                                onEditTemplate={handleEditTemplate}
                                onDeletePersona={handleDeletePersona}
                                onDeleteTemplate={handleDeleteTemplate}
                              />
                            </PopoverContent>
                          </Popover>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {currentPersona && !currentPersona.is_default
                              ? `Persona: ${currentPersona.name}`
                              : "Personas & Templates"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Web Search */}
                    {currentModelSupportsSearch && (
                      <>
                        <div className="w-px h-4 bg-border/50 mx-2" />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleWebSearchToggle}
                                className={cn(
                                  "h-7 w-7 rounded-lg transition-all duration-200 hover:scale-105",
                                  webSearchEnabled
                                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                                    : "hover:bg-muted/30 text-muted-foreground hover:text-foreground",
                                )}
                                aria-label={webSearchEnabled ? "Disable web search" : "Enable web search"}
                                disabled={status === "streaming" || status === "submitted"}
                              >
                                <Search className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{webSearchEnabled ? "Web Search Active" : "Enable Web Search"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}

                    <div className="w-px h-4 bg-border/50 mx-2" />

                    {/* Send Button */}
                    {status === "submitted" || status === "streaming" ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={stop}
                              className="h-8 w-8 rounded-lg border hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200 hover:scale-105"
                            >
                              <StopIcon size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Stop generating</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleSubmit}
                              variant="default"
                              size="icon"
                              disabled={isDisabled}
                              className={cn(
                                "h-8 w-8 rounded-lg transition-all duration-200 shadow-md",
                                !isDisabled && "hover:scale-110 hover:shadow-lg",
                                isDisabled && "opacity-50 cursor-not-allowed",
                              )}
                            >
                              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpIcon size={16} />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isUploading ? "Uploading..." : "Send message"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
              </div>
            </div>

            {/* Mobile Layout - Compact Single Row */}
            <div className="sm:hidden flex items-center justify-between px-3 py-2 border-t border-border/30">
              {/* Left - Model Selector (Compact) */}
              <div className="flex items-center">
                <div className="bg-muted/60 dark:bg-muted/40 rounded-lg px-2 py-1 border border-border/50">
                  <ChatModelDropdown />
                </div>
              </div>

              {/* Right - Essential Actions Only */}
              <div className="flex items-center gap-1">
                {/* File Upload */}
                <FileUpload
                  threadId={threadId}
                  onFileUpload={handleFileUpload}
                  uploadedFiles={uploadedFiles}
                  onRemoveFile={handleRemoveFile}
                  onUploadingChange={setIsUploading}
                  disabled={status === "streaming" || status === "submitted"}
                />

                {/* Settings Menu - Persona, Web Search, Artifacts */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                      disabled={status === "streaming" || status === "submitted"}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 p-2 max-h-[50vh] overflow-y-auto" align="end" side="top" sideOffset={8}>
                    <div className="space-y-1">
                      {/* Persona */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start gap-2 h-8">
                            {currentPersona && !currentPersona.is_default ? (
                              <span>{currentPersona.avatar_emoji}</span>
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                            <span className="text-sm">Persona</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="end">
                          <PersonaTemplateSelector
                            threadId={threadId}
                            onPersonaSelect={(persona) => {}}
                            onTemplateSelect={handleTemplateSelect}
                            onCreatePersona={() => setCreatePersonaOpen(true)}
                            onCreateTemplate={() => setCreateTemplateOpen(true)}
                            onEditPersona={handleEditPersona}
                            onEditTemplate={handleEditTemplate}
                            onDeletePersona={handleDeletePersona}
                            onDeleteTemplate={handleDeleteTemplate}
                          />
                        </PopoverContent>
                      </Popover>

                      {/* Web Search */}
                      {currentModelSupportsSearch && (
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-2 h-8"
                          onClick={handleWebSearchToggle}
                        >
                          <Search className={cn("h-3 w-3", webSearchEnabled ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-sm">Web Search {webSearchEnabled ? "On" : "Off"}</span>
                        </Button>
                      )}

                      {/* Artifacts */}
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2 h-8"
                        onClick={() => setArtifactPickerOpen(true)}
                      >
                        <Archive className="h-3 w-3" />
                        <span className="text-sm">Artifacts</span>
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Advanced Tools - Separate Button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                      disabled={status === "streaming" || status === "submitted"}
                    >
                      <Wrench className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 p-2 max-h-[50vh] overflow-y-auto" align="end" side="top" sideOffset={8}>
                    <ToolsDropdown />
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Send Button */}
                {status === "submitted" || status === "streaming" ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={stop}
                    className="h-6 w-6 rounded-lg border hover:bg-destructive/10 hover:border-destructive/50"
                  >
                    <StopIcon size={12} />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    variant="default"
                    size="icon"
                    disabled={isDisabled}
                    className={cn(
                      "h-6 w-6 rounded-lg shadow-md",
                      !isDisabled && "hover:scale-110 hover:shadow-lg",
                      isDisabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpIcon size={12} />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Builder */}
      <WorkflowBuilder
        open={workflowBuilderOpen}
        onOpenChange={setWorkflowBuilderOpen}
        threadId={threadId}
        onRefreshMessages={onRefreshMessages}
      />

      {/* Artifact Picker Dialog */}
      <ArtifactPicker
        threadId={threadId}
        onSelectArtifact={handleArtifactSelect}
        open={artifactPickerOpen}
        onOpenChange={setArtifactPickerOpen}
        trigger={<div style={{ display: 'none' }} />} // Hidden trigger since we control it manually
      />

      {/* Enhanced Web Search Status Indicator */}
      {searchStatusMessage && (
        <div className="absolute -top-14 left-4 right-4 flex items-center justify-center">
          <div
            className={cn(
              "text-white text-xs px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg border backdrop-blur-lg",
              "animate-in slide-in-from-bottom-2 duration-300",
              currentModelSupportsSearch
                ? "bg-primary/85 border-primary/40"
                : "bg-orange-500/85 border-orange-400/40",
            )}
          >
            <div className="flex items-center gap-1.5">
              <Search className="h-3 w-3" />
              <span className="font-medium">{searchStatusMessage}</span>
              {!currentModelSupportsSearch && <Info className="h-3 w-3" />}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreatePersonaDialog open={createPersonaOpen} onOpenChange={setCreatePersonaOpen} />
      <CreateTemplateDialog
        open={createTemplateOpen}
        onOpenChange={setCreateTemplateOpen}
        selectedPersonaId={currentPersona?.id}
      />
      <EditPersonaDialog open={editPersonaOpen} onOpenChange={setEditPersonaOpen} persona={editingPersona} />
      <EditTemplateDialog open={editTemplateOpen} onOpenChange={setEditTemplateOpen} template={editingTemplate} />

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={deletePersonaOpen} onOpenChange={setDeletePersonaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Persona</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPersona?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePersona}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTemplateOpen} onOpenChange={setDeleteTemplateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const { selectedModel, setModel, getEnabledModels, ensureValidSelectedModel, favoriteModels, toggleFavoriteModel } =
    useModelStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavorites, setShowFavorites] = useState(true)

  // Ensure valid model selection on mount
  useEffect(() => {
    // Only ensure valid model if not currently loading API keys
    const apiKeyStore = useAPIKeyStore.getState()
    if (!apiKeyStore.isLoading) {
      ensureValidSelectedModel()
    }
  }, [ensureValidSelectedModel])

  // Get only enabled models that have API keys
  const availableModels = useMemo(() => {
    return getEnabledModels()
  }, [getEnabledModels])

  const getModelIcon = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    return <ProviderLogo provider={modelConfig.provider} size="sm" />
  }, [])

  const getModelBadges = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    const badges = []

    if (modelConfig.supportsSearch) {
      badges.push(
        <div key="search" className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Search className="w-3 h-3 text-primary" />
        </div>,
      )
    }

    if (modelConfig.supportsThinking) {
      badges.push(
        <div key="thinking" className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-pink-400" />
        </div>,
      )
    }

    return badges
  }, [])

  const getProviderName = useCallback((model: AIModel) => {
    const modelConfig = getModelConfig(model)
    switch (modelConfig.provider) {
      case "openai":
        return "OpenAI"
      case "google":
        return "Google"
      case "openrouter":
        return "OpenRouter"
      case "ollama":
        return "Ollama"
      default:
        return ""
    }
  }, [])

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!searchQuery) return availableModels
    return availableModels.filter(
      (model) =>
        model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getProviderName(model).toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [availableModels, searchQuery, getProviderName])

  const filteredFavorites = useMemo(() => {
    if (!searchQuery) return favoriteModels
    return favoriteModels.filter(
      (model) =>
        model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getProviderName(model).toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [favoriteModels, searchQuery, getProviderName])

  const otherModels = useMemo(() => {
    return filteredModels.filter((model) => !favoriteModels.includes(model))
  }, [filteredModels, favoriteModels])

  if (availableModels.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-8 px-3 text-sm rounded-md text-muted-foreground"
          disabled
        >
          <span className="font-medium">No models available</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1 sm:gap-2 h-6 sm:h-7 px-2 sm:px-2.5 text-sm rounded-lg text-foreground hover:bg-muted/30 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary transition-all duration-200"
            aria-label={`Selected model: ${selectedModel}`}
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="scale-75">{getModelIcon(selectedModel)}</div>
              <span className="font-medium max-w-[80px] sm:max-w-[100px] truncate text-xs">{selectedModel.replace("ollama:", "")}</span>
              <div className="hidden sm:flex items-center gap-0.5 scale-75">{getModelBadges(selectedModel)}</div>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[min(480px,calc(100vw-1rem))] max-h-[70vh] p-0" align="start">
          <div className="bg-background border-0">
            {/* Search Header */}
            <div className="p-4 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                />
              </div>
            </div>

            <div className="max-h-[calc(70vh-80px)] overflow-y-auto">
              {/* Favorites Section */}
              {filteredFavorites.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Favorites</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredFavorites.map((model) => (
                      <div
                        key={model}
                        onClick={() => setModel(model)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-muted/50",
                          selectedModel === model
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border/50 hover:border-border",
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getModelIcon(model)}
                            {selectedModel === model && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="flex items-center gap-1">{getModelBadges(model)}</div>
                        </div>
                        <div className="text-sm font-medium text-foreground mb-1">
                          {model.replace("ollama:", "").split(" ").slice(0, 2).join(" ")}
                        </div>
                        <div className="text-xs text-muted-foreground">{getProviderName(model)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Sections */}
              {(["openai", "google", "openrouter", "ollama"] as const).map((provider) => {
                const providerModels = otherModels.filter(
                  (model) => getModelConfig(model).provider === provider
                )
                if (providerModels.length === 0) return null

                return (
                  <div key={provider} className="p-4 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <ProviderLogo provider={provider} size="sm" />
                      <span className="text-sm font-medium">{getProviderName(providerModels[0])}</span>
                    </div>
                    <div className="space-y-1">
                      {providerModels.map((model) => (
                        <div
                          key={model}
                          onClick={() => setModel(model)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50",
                            selectedModel === model ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/30",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {getModelIcon(model)}
                            <div>
                              <div className="text-sm font-medium text-foreground">{model.replace("ollama:", "")}</div>
                            </div>
                            {selectedModel === model && <div className="w-2 h-2 rounded-full bg-primary ml-2" />}
                          </div>
                          <div className="flex items-center gap-1">{getModelBadges(model)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* No Results */}
              {filteredModels.length === 0 && (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No models found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
                </div>
              )}

              {/* Settings Link */}
              <div className="p-4 border-t border-border/50">
                <button
                  onClick={() => navigate("/settings?tab=models")}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <Settings className="w-4 h-4" />
                  <span>Manage models in Settings</span>
                </button>
              </div>
            </div>
          </div>
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
