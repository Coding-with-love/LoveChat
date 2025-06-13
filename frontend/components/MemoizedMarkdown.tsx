"use client"

import type React from "react"
import { memo, useState, useCallback, useContext, useMemo } from "react"
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
import { Code2 } from "lucide-react"
import { ArrowLeft, Loader2 } from "lucide-react" // Import ArrowLeft and Loader2

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
  table: ({ children, ...props }) => (
    <div className="table-wrapper overflow-x-auto my-6">
      <table {...props}>{children}</table>
    </div>
  ),
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

  // Memoize the language to prevent unnecessary re-renders
  const language = useMemo(() => {
    return languageMatch?.[1] || null
  }, [languageMatch])

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
    [codeString, onCodeConvert],
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
        data-code-block="true" // Add this attribute to help identify code blocks
      >
        <div
          className="flex justify-between items-center px-4 py-2 bg-secondary text-foreground"
          data-code-block-header="true" // Add this attribute to help identify code block headers
        >
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
                <CodeConverter
                  code={codeString}
                  currentLanguage={language}
                  onConvert={handleConvert}
                  threadId={threadId}
                  messageId={messageId}
                />
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
              {copied ? <Code2 className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div
          className={cn(
            "transition-all duration-300",
            showConverted ? "bg-blue-50/20 dark:bg-blue-950/20 border-t border-blue-200 dark:border-blue-800" : "",
          )}
          data-code-block-content="true" // Add this attribute to help identify code block content
        >
          <div className="relative">
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
              return (
                <div className="math-wrapper">
                  <div
                    className="katex-display"
                    dangerouslySetInnerHTML={{
                      __html: renderMath(mathContent, true),
                    }}
                  />
                </div>
              )
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
  ({ content, id, size = "default", threadId, messageId, onCodeConvert }: MarkdownProps) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content])

    const proseClasses =
      size === "small"
        ? "prose prose-sm dark:prose-invert max-w-none w-full prose-code:before:content-none prose-code:after:content-none"
        : "prose prose-base dark:prose-invert max-w-none w-full prose-code:before:content-none prose-code:after:content-none"

    return (
      <MarkdownContext.Provider value={{ size, threadId, messageId, onCodeConvert }}>
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
