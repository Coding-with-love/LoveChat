"use client"

import { memo, useMemo, useState, createContext, useContext, useEffect, useCallback } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { marked } from "marked"
import ShikiHighlighter from "react-shiki"
import type { ComponentProps } from "react"
import type { ExtraProps } from "react-markdown"
import { Check, Copy, Code2, ArrowLeft, Loader2 } from "lucide-react"
import CodeConverter from "@/frontend/components/CodeConverter"
import { cn } from "@/lib/utils"
import { useCodeConversions } from "@/frontend/hooks/useCodeConversion"
import { getShikiLanguage } from "@/lib/language-mapping"

type CodeComponentProps = ComponentProps<"code"> & ExtraProps
type MarkdownSize = "default" | "small"

// Context to pass size and onCodeConvert down to components
interface MarkdownContextType {
  size: MarkdownSize
  threadId?: string
  messageId?: string
  onCodeConvert?: (originalCode: string, convertedCode: string, target: string) => void
}

const MarkdownContext = createContext<MarkdownContextType>({ size: "default" })

interface MarkdownProps {
  content: string
  id: string
  size?: MarkdownSize
  threadId?: string
  messageId?: string
  onCodeConvert?: (originalCode: string, convertedCode: string, target: string) => void
}

const components: Components = {
  code: CodeBlock as Components["code"],
  pre: ({ children }) => <>{children}</>,
}

function CodeBlock({ children, className, ...props }: CodeComponentProps) {
  const { size, onCodeConvert, threadId, messageId } = useContext(MarkdownContext)
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [convertedCode, setConvertedCode] = useState<{ code: string; language: string } | null>(null)
  const [showConverted, setShowConverted] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

  // Memoize the regex match to prevent it from changing on every render
  const languageMatch = useMemo(() => {
    return /language-(\w+)/.exec(className || "")
  }, [className])

  const codeString = String(children)
  const codeConversions = useCodeConversions(threadId, messageId)

  // Memoize the language to prevent unnecessary re-renders
  const language = useMemo(() => {
    return languageMatch?.[1] || null
  }, [languageMatch])

  // Check for existing conversions - use useCallback to stabilize the function
  const checkExistingConversions = useCallback(() => {
    if (!language || !codeConversions?.conversions?.length) {
      return
    }

    const existingConversions = codeConversions.findConversionsForCode(codeString, language)

    if (existingConversions.length > 0) {
      // Use the most recent conversion
      const latestConversion = existingConversions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0]

      const newConvertedCode = {
        code: latestConversion.converted_code,
        language: latestConversion.target_language,
      }

      // Only update state if the converted code has actually changed
      setConvertedCode((prevCode) => {
        if (!prevCode || prevCode.code !== newConvertedCode.code || prevCode.language !== newConvertedCode.language) {
          return newConvertedCode
        }
        return prevCode
      })
    }
  }, [language, codeConversions, codeString])

  // Use useEffect with stable dependencies
  useEffect(() => {
    checkExistingConversions()
  }, [checkExistingConversions])

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
        // Save to database if we have thread and message IDs
        if (threadId && messageId && codeConversions) {
          await codeConversions.saveConversion(codeString, language || "text", converted, target)
        }

        // Update local state immediately
        const newConvertedCode = { code: converted, language: target.toLowerCase() }
        setConvertedCode(newConvertedCode)
        setShowConverted(true)

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
    [threadId, messageId, codeConversions, codeString, language, onCodeConvert],
  )

  const toggleView = useCallback(() => {
    setShowConverted((prev) => !prev)
  }, [])

  if (languageMatch && language) {
    const displayLang = convertedCode && showConverted ? convertedCode.language : language
    const displayCode = convertedCode && showConverted ? convertedCode.code : codeString

    // Use the language mapping to get a valid Shiki language
    const shikiLanguage = getShikiLanguage(displayLang)

    return (
      <div
        className="rounded-md relative mb-4 overflow-visible border border-border shadow-sm"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex justify-between items-center px-4 py-2 bg-secondary text-foreground">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono">{displayLang}</span>
            {convertedCode && (
              <button
                onClick={toggleView}
                className={cn(
                  "text-xs px-2 py-0.5 rounded transition-colors flex items-center space-x-1",
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
          <div className="flex items-center space-x-2">
            {onCodeConvert && isHovered && !isConverting && (
              <div className="relative z-50">
                <CodeConverter code={codeString} currentLanguage={language} onConvert={handleConvert} />
              </div>
            )}
            {isConverting && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                <span>Converting...</span>
              </div>
            )}
            <button
              onClick={() => copyToClipboard(displayCode)}
              className="text-sm cursor-pointer hover:text-primary transition-colors p-1 rounded-md hover:bg-muted"
              aria-label="Copy code"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div
          className={cn(
            "transition-all duration-300",
            showConverted ? "bg-blue-50/20 dark:bg-blue-950/20 border-t border-blue-200 dark:border-blue-800" : "",
          )}
        >
          <ShikiHighlighter
            language={shikiLanguage}
            theme={"material-theme-darker"}
            className="text-sm font-mono"
            showLanguage={false}
          >
            {displayCode}
          </ShikiHighlighter>
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
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, [remarkMath]]} rehypePlugins={[rehypeKatex]} components={components}>
      {content}
    </ReactMarkdown>
  )
}

const MarkdownRendererBlock = memo(PureMarkdownRendererBlock, (prevProps, nextProps) => {
  if (prevProps.content !== nextProps.content) return false
  return true
})

MarkdownRendererBlock.displayName = "MarkdownRendererBlock"

const MemoizedMarkdown = memo(
  ({ content, id, size = "default", threadId, messageId, onCodeConvert }: MarkdownProps) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content])

    const proseClasses =
      size === "small"
        ? "prose prose-sm dark:prose-invert bread-words max-w-none w-full prose-code:before:content-none prose-code:after:content-none"
        : "prose prose-base dark:prose-invert bread-words max-w-none w-full prose-code:before:content-none prose-code:after:content-none"

    return (
      <MarkdownContext.Provider value={{ size, threadId, messageId, onCodeConvert }}>
        <div className={proseClasses}>
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
