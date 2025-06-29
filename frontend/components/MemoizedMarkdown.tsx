"use client"

import type React from "react"
import { memo, useState, useCallback, useContext, useMemo, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { marked } from "marked"
import ShikiHighlighter from "react-shiki"
import { cn } from "@/lib/utils"
import { getShikiLanguage } from "@/lib/language-mapping"
import katex from "katex"
import CodeConverter from "@/frontend/components/CodeConverter"
import { createContext } from "react"
import type { ComponentProps } from "react"
import type { ExtraProps, Components } from "react-markdown"
import { Code2, Sparkles, Download, Pin, PinOff, Package, Star, Check, Copy } from 'lucide-react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useArtifactStore } from "@/frontend/stores/ArtifactStore"
import { useCodeConversions } from "@/frontend/hooks/useCodeConversions"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/frontend/components/ui/tooltip"

// Import KaTeX CSS
import "katex/dist/katex.min.css"

type CodeComponentProps = ComponentProps<"code"> & ExtraProps
type MarkdownSize = "default" | "small"

// Context to pass size and onCodeConvert down to components
interface MarkdownContextType {
  size: MarkdownSize
  threadId?: string
  messageId?: string
  onCodeConvert?: (originalCode: string, convertedCode: string, target: string) => void
  isArtifactMessage?: boolean // New flag to identify artifact messages
}

const MarkdownContext = createContext<MarkdownContextType>({ size: "default" })

interface MarkdownProps {
  content: string
  id: string
  size?: MarkdownSize
  threadId?: string
  messageId?: string
  onCodeConvert?: (originalCode: string, convertedCode: string, target: string) => void
  isArtifactMessage?: boolean // New prop to identify artifact messages
}

const components: Components = {
  code: CodeBlock as Components["code"],
  pre: ({ children }) => <>{children}</>,
  table: TableWithArtifactIndicator as Components["table"],
  thead: ({ children, ...props }) => <thead {...props}>{children}</thead>,
  tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
  tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
  th: ({ children, ...props }) => <th {...props}>{children}</th>,
  td: ({ children, ...props }) => <td {...props}>{children}</td>,
}

type MathComponentProps = {
  value: string
}

type ExtendedCodeProps = CodeComponentProps & {
  inline?: boolean
  node?: any
}

type ExtendedComponents = Components & {
  math: React.ComponentType<MathComponentProps>
  inlineMath: React.ComponentType<MathComponentProps>
}

// Custom Table component with artifact indicator
function TableWithArtifactIndicator({ children, ...props }: ComponentProps<"table">) {
  const { threadId, messageId, isArtifactMessage } = useContext(MarkdownContext)
  const { getArtifactByContent, artifacts } = useArtifactStore()
  const [isHovered, setIsHovered] = useState(false)

  // Extract table content for artifact matching
  const tableContent = useMemo(() => {
    // This is a simplified way to get table content - in a real implementation
    // you might want to extract the actual markdown table syntax
    return String(children)
  }, [children])

  // Check if this table has an associated artifact
  const associatedArtifact = useMemo(() => {
    if (!tableContent || !isArtifactMessage) return null
    return getArtifactByContent(tableContent, messageId)
  }, [tableContent, messageId, getArtifactByContent, artifacts, isArtifactMessage])

  const hasArtifact = Boolean(associatedArtifact)

  return (
    <div 
      className="table-wrapper overflow-x-auto my-6 max-w-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hasArtifact && isHovered && associatedArtifact && (
        <div className="absolute top-2 right-2 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center p-1 bg-primary/10 border border-primary/30 rounded-full shadow-sm hover:shadow-md transition-all duration-200 cursor-help">
                  <Package className="w-3 h-3 text-primary hover:text-primary/80 transition-colors" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">Saved as Artifact</p>
                  <p className="text-xs font-medium text-foreground">"{associatedArtifact.title}"</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      <table {...props} className="min-w-full border-collapse">
        {children}
      </table>
    </div>
  )
}

// Custom Math component with artifact indicator
function DisplayMathWithArtifactIndicator({ value }: MathComponentProps) {
  const { threadId, messageId, isArtifactMessage } = useContext(MarkdownContext)
  const { getArtifactByContent, artifacts } = useArtifactStore()
  const [isHovered, setIsHovered] = useState(false)

  // Check if this math expression has an associated artifact
  const associatedArtifact = useMemo(() => {
    if (!value || !isArtifactMessage) return null
    const mathContent = `$$${value}$$`
    return getArtifactByContent(mathContent, messageId)
  }, [value, messageId, getArtifactByContent, artifacts, isArtifactMessage])

  const hasArtifact = Boolean(associatedArtifact)

  const renderMath = (tex: string, displayMode: boolean) => {
    try {
      return katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        output: "html",
        strict: false,
        trust: true,
      })
    } catch (error) {
      console.error("KaTeX error:", error)
      return tex
    }
  }

  return (
    <div 
      className="math-wrapper relative my-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hasArtifact && isHovered && associatedArtifact && (
        <div className="absolute top-2 right-2 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center p-1 bg-primary/10 border border-primary/30 rounded-full shadow-sm hover:shadow-md transition-all duration-200 cursor-help">
                  <Package className="w-3 h-3 text-primary hover:text-primary/80 transition-colors" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">Saved as Artifact</p>
                  <p className="text-xs font-medium text-foreground">"{associatedArtifact.title}"</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      <div
        className="katex-display"
        dangerouslySetInnerHTML={{
          __html: renderMath(value, true),
        }}
      />
    </div>
  )
}

function CodeBlock({ children, className, ...props }: CodeComponentProps) {
  const { size, onCodeConvert, threadId, messageId, isArtifactMessage } = useContext(MarkdownContext)
  const { getArtifactByContent, artifacts } = useArtifactStore()
  const { conversions, findConversions, addConversion } = useCodeConversions()
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [convertedCode, setConvertedCode] = useState<{ code: string; language: string } | null>(null)
  const [showConverted, setShowConverted] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  // Memoize the regex match to prevent it from changing on every render
  const languageMatch = useMemo(() => {
    return /language-(\w+)/.exec(className || "")
  }, [className])

  const codeString = String(children)

  // Memoize the language to prevent unnecessary re-renders
  const language = useMemo(() => {
    return languageMatch?.[1] || null
  }, [languageMatch])

  // Check if this code block has an associated artifact
  const associatedArtifact = useMemo(() => {
    if (!codeString || !language) return null
    return getArtifactByContent(codeString, messageId)
  }, [codeString, language, messageId, getArtifactByContent, artifacts])

  // Check if this code block is substantial enough to be an artifact
  const isArtifactCandidate = useMemo(() => {
    if (!language || !isArtifactMessage) return false
    
    const lines = codeString.split('\n').length
    const chars = codeString.length
    
    // Consider it an artifact if it's substantial code (3+ lines or 100+ chars)
    return lines > 3 || chars > 100
  }, [language, codeString, isArtifactMessage])

  // Determine if this code block should show artifact styling
  const hasArtifact = Boolean(associatedArtifact)
  const showArtifactStyling = hasArtifact || isArtifactCandidate

  // Load existing conversions when component mounts
  useEffect(() => {
    if (threadId && messageId && language) {
      console.log("🔍 Loading conversions for code block:", {
        threadId,
        messageId,
        language,
        codeLength: codeString.length
      })
      findConversions(threadId, messageId)
    }
  }, [threadId, messageId, language, findConversions, codeString.length])

  // Check for existing conversion for this specific code block
  useEffect(() => {
    console.log("🔍 Checking for existing conversions:", {
      conversionsCount: conversions.length,
      hasCodeString: !!codeString,
      language,
      hasConvertedCode: !!convertedCode
    })

    if (conversions.length > 0 && codeString && language) {
      // Normalize code for comparison (remove extra whitespace)
      const normalizedCode = codeString.replace(/\s+/g, " ").trim()
      
      console.log("🔍 Looking for matching conversion in", conversions.length, "conversions")
      
      // Find a conversion that matches this code block
      const matchingConversion = conversions.find(conv => {
        const normalizedOriginal = conv.original_code.replace(/\s+/g, " ").trim()
        const isCodeMatch = normalizedOriginal === normalizedCode ||
          normalizedOriginal.replace(/\s+/g, "") === normalizedCode.replace(/\s+/g, "") ||
          (normalizedOriginal.length > 20 && normalizedCode.includes(normalizedOriginal.substring(0, 20)))
        
        const isLanguageMatch = conv.original_language === language
        
        console.log("🔍 Checking conversion:", {
          conversionId: conv.id,
          sourceLanguage: conv.original_language,
          targetLanguage: conv.target_language,
          isCodeMatch,
          isLanguageMatch,
          originalCodeLength: conv.original_code.length,
          currentCodeLength: codeString.length
        })
        
        return isCodeMatch && isLanguageMatch
      })

      if (matchingConversion && !convertedCode) {
        console.log("✅ Found existing conversion for code block:", {
          sourceLanguage: matchingConversion.original_language,
          targetLanguage: matchingConversion.target_language,
          codeLength: matchingConversion.converted_code.length
        })
        
        setConvertedCode({
          code: matchingConversion.converted_code,
          language: matchingConversion.target_language.toLowerCase()
        })
        // Don't auto-show converted code, let user toggle
      } else if (!matchingConversion) {
        console.log("❌ No matching conversion found for this code block")
      }
    }
  }, [conversions, codeString, language, convertedCode])

  // Debug logging to track convert button visibility (only when needed)
  useEffect(() => {
    if (language && isHovered) { // Only log when hovering over actual code blocks
      console.log("🔍 CodeBlock debug info:", {
        hasOnCodeConvert: !!onCodeConvert,
        isHovered,
        isConverting,
        threadId,
        messageId,
        language,
        codeLength: codeString.length,
        shouldShowConvert: onCodeConvert && isHovered && !isConverting,
        hasExistingConversion: !!convertedCode
      })
    }
  }, [onCodeConvert, isHovered, isConverting, threadId, messageId, language, codeString.length, convertedCode])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to copy code to clipboard:", error)
    }
  }

  const handleConvert = useCallback(
    async (converted: string, target: string) => {
      setIsConverting(true)

      try {
        // Update local state immediately
        const newConvertedCode = { code: converted, language: target.toLowerCase() }
        setConvertedCode(newConvertedCode)
        setShowConverted(true)

        // Add to conversions list for history
        if (threadId && messageId) {
          const newConversion = {
            id: Date.now().toString(), // Temporary ID, will be replaced by server
            thread_id: threadId,
            message_id: messageId,
            original_code: codeString,
            original_language: language || "unknown",
            converted_code: converted,
            target_language: target,
            created_at: new Date().toISOString(),
          }
          addConversion(newConversion)
        }

        // Call parent callback if provided
        if (onCodeConvert) {
          onCodeConvert(codeString, converted, target)
        }
      } catch (error) {
        console.error("❌ Error handling code conversion:", error)
      } finally {
        setIsConverting(false)
      }
    },
    [codeString, onCodeConvert, threadId, messageId, language, addConversion],
  )

  const toggleView = useCallback(() => {
    setShowConverted((prev) => !prev)
  }, [])

  const handlePin = useCallback(() => {
    setIsPinned(!isPinned)
    // Here you could also call an API to save the pinned state
  }, [isPinned])

  const handleDownload = useCallback(() => {
    const blob = new Blob([codeString], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${language || 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [codeString, language])

  // Error boundary for ShikiHighlighter
  const renderCodeWithErrorHandling = useCallback(() => {
    try {
      const displayLang = convertedCode && showConverted ? convertedCode.language : language
      const displayCode = convertedCode && showConverted ? convertedCode.code : codeString
      
      // Use the language mapping to get a valid Shiki language
      const shikiLanguage = getShikiLanguage(displayLang || 'text')
      
      return (
        <div className="relative w-full overflow-hidden">
          <ShikiHighlighter
            language={shikiLanguage}
            theme={"material-theme-darker"}
            className="text-sm font-mono w-full !max-w-none"
            showLanguage={false}
          >
            {displayCode}
          </ShikiHighlighter>
        </div>
      )
    } catch (error) {
      console.error("Error rendering Shiki syntax highlighting:", error)
      setRenderError(error instanceof Error ? error.message : "Unknown rendering error")
      
      // Fallback to basic <pre><code> rendering
      const displayCode = convertedCode && showConverted ? convertedCode.code : codeString
      return (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap break-words">
          <code>{displayCode}</code>
        </pre>
      )
    }
  }, [convertedCode, showConverted, language, codeString])

  if (languageMatch && language) {
    const displayLang = convertedCode && showConverted ? convertedCode.language : language

    return (
      <div
        className={cn(
          "rounded-md relative mb-4 shadow-sm transition-all duration-200 w-full max-w-full",
          "border border-border overflow-hidden"
        )}
        onMouseEnter={(e) => {
          console.log("🔍 CodeBlock mouse enter:", { 
            language, 
            hasOnCodeConvert: !!onCodeConvert,
            threadId,
            messageId,
            codeLength: codeString.length,
            target: e.target,
            currentTarget: e.currentTarget
          })
          setIsHovered(true)
        }}
        onMouseLeave={(e) => {
          console.log("🔍 CodeBlock mouse leave:", { 
            language,
            threadId,
            messageId,
            target: e.target,
            currentTarget: e.currentTarget
          })
          setIsHovered(false)
        }}
        data-code-block="true"
        data-artifact={showArtifactStyling}
        data-has-artifact={hasArtifact}
      >
        <div
          className={cn(
            "flex justify-between items-center px-4 py-2 text-foreground bg-secondary"
          )}
          data-code-block-header="true"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-sm font-mono truncate">
              {displayLang}
            </span>
            {renderError && (
              <span className="text-xs text-red-500 bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded">
                Rendering Error
              </span>
            )}
            {convertedCode && (
              <button
                onClick={toggleView}
                className={cn(
                  "text-xs px-2 py-0.5 rounded transition-colors flex items-center space-x-1 flex-shrink-0",
                  showConverted
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50"
                    : "bg-muted hover:bg-muted/80",
                )}
              >
                {showConverted ? (
                  <>
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    <span>Original</span>
                  </>
                ) : (
                  <>
                    <Code2 className="w-3 h-3 mr-1" />
                    <span>{convertedCode.language}</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {hasArtifact && associatedArtifact && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-primary hover:text-primary/80 transition-colors cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">Saved as Artifact</p>
                      <p className="text-xs font-medium text-foreground">"{associatedArtifact.title}"</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {showArtifactStyling && isHovered && (
              <>
                <button
                  onClick={handlePin}
                  className="text-sm cursor-pointer hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/10"
                  aria-label={isPinned ? "Unpin artifact" : "Pin artifact"}
                  title={isPinned ? "Unpin artifact" : "Pin artifact"}
                >
                  {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="text-sm cursor-pointer hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/10"
                  aria-label="Download artifact"
                  title="Download artifact"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            {onCodeConvert && isHovered && !isConverting && (() => {
              console.log("🔍 Rendering CodeConverter:", {
                hasOnCodeConvert: !!onCodeConvert,
                isHovered,
                isConverting,
                threadId,
                messageId,
                language,
                codeLength: codeString.length
              })
              return (
                <div className="relative z-50">
                  <CodeConverter
                    code={codeString}
                    currentLanguage={language}
                    onConvert={handleConvert}
                    threadId={threadId}
                    messageId={messageId}
                  />
                </div>
              )
            })()}
            {isConverting && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                <span>Converting...</span>
              </div>
            )}
            <button
              onClick={() => copyToClipboard(convertedCode && showConverted ? convertedCode.code : codeString)}
              className="text-sm cursor-pointer hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/10"
              aria-label="Copy code"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div
          className={cn(
            "transition-all duration-300 w-full max-w-full",
            "overflow-x-auto",
            showConverted ? "bg-blue-50/20 dark:bg-blue-950/20 border-t border-blue-200 dark:border-blue-800" : ""
          )}
          data-code-block-content="true"
        >
          {renderCodeWithErrorHandling()}
        </div>
      </div>
    )
  }

  const inlineCodeClasses =
    size === "small"
      ? "mx-0.5 overflow-auto rounded-md px-1 py-0.5 bg-primary/10 text-foreground font-mono text-xs"
      : "mx-0.5 overflow-auto rounded-md px-2 py-1 bg-primary/10 text-foreground font-mono"

  return (
    <code className={inlineCodeClasses} {...props}>
      {children}
    </code>
  )
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function PureMarkdownRendererBlock({ content }: { content: string }) {
  const renderMath = (tex: string, displayMode: boolean) => {
    try {
      return katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        output: "html",
        strict: false,
        trust: true,
      })
    } catch (error) {
      console.error("KaTeX error:", error)
      return tex
    }
  }

  // Pre-process content to ensure proper math formatting
  const processedContent = content
    .replace(/\\$$(.*?)\\$$/g, "$$$1$$") // Convert $$...$$ to $...$ for inline math
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => `\n\n$$${tex.trim()}$$\n\n`) // Add newlines around display math

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [
          rehypeKatex,
          {
            strict: false,
            trust: true,
            throwOnError: false,
            errorColor: "#cc0000",
            globalGroup: true,
            fleqn: false,
            leqno: false,
            minRuleThickness: 0.05,
            maxSize: 10,
            maxExpand: 1000,
            macros: {
              "\\RR": "\\mathbb{R}",
              "\\ZZ": "\\mathbb{Z}",
              "\\NN": "\\mathbb{N}",
              "\\QQ": "\\mathbb{Q}",
              "\\CC": "\\mathbb{C}",
            },
          },
        ],
      ]}
      components={
        {
          ...components,
          code: ({ node, inline, className, children, ...props }: ExtendedCodeProps) => {
            const match = /language-(\w+)/.exec(className || "")
            const isDisplayMath = !inline && !match && String(children).startsWith("$$")

            if (isDisplayMath) {
              const mathContent = String(children).slice(2, -2).trim()
              return <DisplayMathWithArtifactIndicator value={mathContent} />
            }

            return (
              <CodeBlock className={className} {...props}>
                {children}
              </CodeBlock>
            )
          },
          inlineMath: ({ value }: MathComponentProps) => (
            <span
              className="katex-inline"
              dangerouslySetInnerHTML={{
                __html: renderMath(value, false),
              }}
            />
          ),
        } as ExtendedComponents
      }
    >
      {processedContent}
    </ReactMarkdown>
  )
}

const MarkdownRendererBlock = memo(PureMarkdownRendererBlock, (prevProps, nextProps) => {
  if (prevProps.content !== nextProps.content) return false
  return true
})

MarkdownRendererBlock.displayName = "MarkdownRendererBlock"

const MemoizedMarkdown = memo(
  ({ content, id, size = "default", threadId, messageId, onCodeConvert, isArtifactMessage }: MarkdownProps) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content])

    const proseClasses =
      size === "small"
        ? "prose prose-sm dark:prose-invert max-w-none w-full prose-code:before:content-none prose-code:after:content-none"
        : "prose prose-base dark:prose-invert max-w-none w-full prose-code:before:content-none prose-code:after:content-none"

    return (
      <MarkdownContext.Provider value={{ size, threadId, messageId, onCodeConvert, isArtifactMessage }}>
        <div className={proseClasses} data-message-text-content="true">
          {blocks.map((block, index) => (
            <MarkdownRendererBlock content={block} key={`${id}-block-${index}`} />
          ))}
        </div>
      </MarkdownContext.Provider>
    )
  },
)

MemoizedMarkdown.displayName = "MemoizedMarkdown"

export default MemoizedMarkdown
