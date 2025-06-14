import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"
import jsPDF from "jspdf"

// Theme color mappings
const THEME_COLORS = {
  blue: { hue: 240, primary: [0, 100, 200] as [number, number, number], accent: [0, 150, 255] as [number, number, number] },
  pink: { hue: 0, primary: [200, 50, 100] as [number, number, number], accent: [255, 100, 150] as [number, number, number] },
  green: { hue: 150, primary: [0, 150, 100] as [number, number, number], accent: [50, 200, 150] as [number, number, number] },
  purple: { hue: 300, primary: [150, 50, 200] as [number, number, number], accent: [200, 100, 255] as [number, number, number] },
  yellow: { hue: 90, primary: [200, 150, 0] as [number, number, number], accent: [255, 200, 50] as [number, number, number] },
  teal: { hue: 180, primary: [0, 150, 150] as [number, number, number], accent: [50, 200, 200] as [number, number, number] },
  cloudmist: { hue: 210, primary: [100, 150, 200] as [number, number, number], accent: [150, 200, 255] as [number, number, number] },
  peachmeringue: { hue: 45, primary: [200, 120, 50] as [number, number, number], accent: [255, 170, 100] as [number, number, number] },
  cocoadust: { hue: 30, primary: [150, 100, 50] as [number, number, number], accent: [200, 150, 100] as [number, number, number] },
  frostedsage: { hue: 135, primary: [100, 150, 120] as [number, number, number], accent: [150, 200, 170] as [number, number, number] },
}

interface ThemeInfo {
  isDark: boolean
  colorTheme: string
  customHue?: string | null
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    const { threadId, format, theme } = await request.json()

    if (!threadId || !format) {
      return NextResponse.json({ error: "Thread ID and format are required" }, { status: 400 })
    }

    // Get thread and messages (ensure user owns the thread)
    const { data: thread, error: threadError } = await supabaseServer
      .from("threads")
      .select("*")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .single()

    if (threadError) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    const { data: messages, error: messagesError } = await supabaseServer
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    let content = ""
    let contentType = "text/plain"
    let filename = `${thread.title || "conversation"}`

    switch (format) {
      case "markdown":
        content = generateMarkdown(thread, messages)
        contentType = "text/markdown"
        filename += ".md"
        break
      case "txt":
        content = generatePlainText(thread, messages)
        contentType = "text/plain"
        filename += ".txt"
        break
      case "pdf":
        const pdfBuffer = generatePDF(thread, messages, theme)
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${thread.title || "conversation"}.pdf"`,
          },
        })
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 })
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateMarkdown(thread: any, messages: any[]) {
  let content = `# ${thread.title}\n\n`
  content += `**Created:** ${new Date(thread.created_at).toLocaleString()}\n\n`
  content += `---\n\n`

  messages.forEach((message) => {
    const timestamp = new Date(message.created_at).toLocaleString()
    const role = message.role === "user" ? "User" : "Assistant"

    content += `## ${role} - ${timestamp}\n\n`
    content += `${message.content}\n\n`

    if (message.reasoning) {
      content += `*Reasoning:* ${message.reasoning}\n\n`
    }

    content += `---\n\n`
  })

  return content
}

function generatePDF(thread: any, messages: any[], themeInfo?: ThemeInfo): Buffer {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Get theme colors that match the chat interface
  const getThemeColors = () => {
    if (!themeInfo) {
      return {
        background: [255, 255, 255] as [number, number, number],
        text: [20, 20, 25] as [number, number, number],
        primary: [0, 100, 200] as [number, number, number],
        secondary: [100, 100, 100] as [number, number, number],
        accent: [0, 150, 255] as [number, number, number],
        userBubble: [248, 248, 250] as [number, number, number], // bg-secondary
        userBubbleBorder: [220, 220, 230] as [number, number, number], // border-secondary-foreground/2
        codeBackground: [245, 245, 245] as [number, number, number],
        border: [200, 200, 200] as [number, number, number],
      }
    }

    const isDark = themeInfo.isDark
    let themeColors = THEME_COLORS.blue // default

    if (themeInfo.colorTheme === "custom" && themeInfo.customHue) {
      const hue = parseInt(themeInfo.customHue)
      themeColors = {
        hue,
        primary: isDark ? [150, 100, 255] as [number, number, number] : [100, 50, 200] as [number, number, number],
        accent: isDark ? [200, 150, 255] as [number, number, number] : [150, 100, 255] as [number, number, number],
      }
    } else if (themeInfo.colorTheme in THEME_COLORS) {
      themeColors = THEME_COLORS[themeInfo.colorTheme as keyof typeof THEME_COLORS]
    }

    if (isDark) {
      return {
        background: [25, 25, 30] as [number, number, number],
        text: [240, 240, 245] as [number, number, number],
        primary: [
          Math.min(255, themeColors.primary[0] + 50),
          Math.min(255, themeColors.primary[1] + 50),
          Math.min(255, themeColors.primary[2] + 50)
        ] as [number, number, number],
        secondary: [160, 160, 170] as [number, number, number],
        accent: [
          Math.min(255, themeColors.accent[0] + 30),
          Math.min(255, themeColors.accent[1] + 30),
          Math.min(255, themeColors.accent[2] + 30)
        ] as [number, number, number],
        userBubble: [40, 40, 45] as [number, number, number], // dark bg-secondary
        userBubbleBorder: [60, 60, 70] as [number, number, number], // dark border
        codeBackground: [40, 40, 45] as [number, number, number],
        border: [60, 60, 70] as [number, number, number],
      }
    } else {
      return {
        background: [255, 255, 255] as [number, number, number],
        text: [20, 20, 25] as [number, number, number],
        primary: themeColors.primary as [number, number, number],
        secondary: [100, 100, 110] as [number, number, number],
        accent: themeColors.accent as [number, number, number],
        userBubble: [248, 248, 250] as [number, number, number], // bg-secondary
        userBubbleBorder: [220, 220, 230] as [number, number, number], // border-secondary-foreground/2
        codeBackground: [248, 248, 250] as [number, number, number],
        border: [220, 220, 230] as [number, number, number],
      }
    }
  }

  const colors = getThemeColors()

  // Set background color for dark theme
  if (themeInfo?.isDark) {
    doc.setFillColor(colors.background[0], colors.background[1], colors.background[2])
    doc.rect(0, 0, pageWidth, pageHeight, 'F')
  }

  // Helper function to check if we need a new page
  const checkNewPage = (requiredHeight: number = 20) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage()
      if (themeInfo?.isDark) {
        doc.setFillColor(colors.background[0], colors.background[1], colors.background[2])
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
      }
      yPosition = margin
      return true
    }
    return false
  }

  // Enhanced text rendering
  const addText = (
    text: string, 
    fontSize: number = 12, 
    style: 'normal' | 'bold' | 'italic' = 'normal',
    color: [number, number, number] = colors.text,
    font: 'helvetica' | 'times' | 'courier' = 'helvetica',
    maxTextWidth: number = maxWidth
  ) => {
    if (!text) return

    doc.setFont(font, style)
    doc.setFontSize(fontSize)
    doc.setTextColor(color[0], color[1], color[2])

    const lines = doc.splitTextToSize(text, maxTextWidth)
    const lineHeight = fontSize * 0.7
    const totalHeight = lines.length * lineHeight
    
    checkNewPage(totalHeight + 10)

    lines.forEach((line: string) => {
      checkNewPage(lineHeight + 5)
      doc.text(line, margin, yPosition)
      yPosition += lineHeight
    })
    
    yPosition += fontSize * 0.3
  }

  // Render user message bubble (right-aligned with background)
  const renderUserMessage = (content: string, timestamp: string) => {
    const bubbleMaxWidth = maxWidth * 0.8 // 80% max width like the chat
    const bubbleMargin = maxWidth * 0.2 // 20% right margin
    
    checkNewPage(60)
    
    // Calculate content height for bubble sizing
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const contentLines = doc.splitTextToSize(content, bubbleMaxWidth - 16) // Account for padding
    const contentHeight = contentLines.length * (11 * 0.7) + 16 // Add padding
    
    // Draw bubble background (rounded rectangle)
    doc.setFillColor(colors.userBubble[0], colors.userBubble[1], colors.userBubble[2])
    doc.setDrawColor(colors.userBubbleBorder[0], colors.userBubbleBorder[1], colors.userBubbleBorder[2])
    doc.setLineWidth(0.5)
    doc.roundedRect(margin + bubbleMargin, yPosition - 5, bubbleMaxWidth, contentHeight, 8, 8, 'FD')
    
    // Add timestamp (small, right-aligned above bubble)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
    const timestampWidth = doc.getTextWidth(timestamp)
    doc.text(timestamp, margin + maxWidth - timestampWidth, yPosition - 8)
    
    // Add content inside bubble
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
    
    let bubbleY = yPosition + 3
    contentLines.forEach((line: string) => {
      doc.text(line, margin + bubbleMargin + 8, bubbleY)
      bubbleY += 11 * 0.7
    })
    
    yPosition += contentHeight + 10
  }

  // Render assistant message (left-aligned, full width, no bubble)
  const renderAssistantMessage = (content: string, timestamp: string) => {
    checkNewPage(40)
    
    // Add role and timestamp
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2])
    doc.text('Assistant', margin, yPosition)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
    doc.text(timestamp, margin + 60, yPosition)
    yPosition += 15
    
    // Render markdown content
    renderMarkdownContent(content, 11)
    yPosition += 10
  }

  // Enhanced markdown content renderer that matches the chat interface
  const renderMarkdownContent = (content: string, baseFontSize: number = 11) => {
    if (!content) return

    const lines = content.split('\n')
    let inCodeBlock = false
    let codeBlockContent = ''
    let codeBlockLanguage = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
                  if (codeBlockContent.trim()) {
          renderCodeBlock(codeBlockContent, codeBlockLanguage, baseFontSize)
        }
          inCodeBlock = false
          codeBlockContent = ''
          codeBlockLanguage = ''
        } else {
          inCodeBlock = true
          codeBlockLanguage = line.trim().substring(3).trim()
          codeBlockContent = ''
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n'
        continue
      }

      // Handle different markdown elements with chat-like styling
      if (line.startsWith('# ')) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(baseFontSize + 6)
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        addText(line.substring(2), baseFontSize + 6, 'bold', colors.text)
        yPosition += 5
      } else if (line.startsWith('## ')) {
        addText(line.substring(3), baseFontSize + 4, 'bold', colors.text)
        yPosition += 4
      } else if (line.startsWith('### ')) {
        addText(line.substring(4), baseFontSize + 2, 'bold', colors.text)
        yPosition += 3
      } else if (line.trim().startsWith('> ')) {
        // Blockquotes with left border (like chat interface)
        renderBlockquote(line.substring(line.indexOf('>') + 1).trim(), baseFontSize)
      } else if (line.trim().match(/^[-*+] /) || line.trim().match(/^\d+\. /)) {
        // Handle both bullet points and numbered lists with proper indentation
        renderListItem(line, baseFontSize)
      } else if (line.includes('**') || line.includes('__') || line.includes('*') || line.includes('_')) {
        // Text with formatting (bold, italic, or both)
        renderFormattedText(line, baseFontSize)
        // Don't reset font here as renderFormattedText handles it
      } else if (line.trim()) {
        // Regular text with proper prose styling
        addText(line, baseFontSize, 'normal', colors.text)
      } else {
        // Empty line - add spacing like prose
        yPosition += baseFontSize * 0.5
      }
    }

    // Handle any remaining code block
    if (inCodeBlock && codeBlockContent.trim()) {
      renderCodeBlock(codeBlockContent, codeBlockLanguage, baseFontSize)
      // Reset font after code block
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(baseFontSize)
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
    }
  }

  // Code block rendering that matches chat interface
  const renderCodeBlock = (code: string, language: string, baseFontSize: number) => {
    const codeLines = code.trim().split('\n')
    const lineHeight = baseFontSize * 0.8
    const padding = 12
    const totalHeight = codeLines.length * lineHeight + padding * 2

    checkNewPage(totalHeight + 20)

    // Calculate the full code block area
    const blockStartY = yPosition
    
    // Draw the main code block background (like in chat interface)
    doc.setFillColor(colors.codeBackground[0], colors.codeBackground[1], colors.codeBackground[2])
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
    doc.setLineWidth(0.5)
    doc.roundedRect(margin - 5, blockStartY - 5, maxWidth + 10, totalHeight + 10, 6, 6, 'FD')

    // Add language label if present (like in chat)
    if (language) {
      // Language label background (darker/different color)
      const labelHeight = 16
      doc.setFillColor(
        Math.max(0, colors.codeBackground[0] - 20),
        Math.max(0, colors.codeBackground[1] - 20),
        Math.max(0, colors.codeBackground[2] - 20)
      )
      doc.roundedRect(margin - 3, yPosition - 3, 80, labelHeight, 3, 3, 'F')
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
      doc.text(language.toUpperCase(), margin, yPosition + 8)
      yPosition += labelHeight + 5
    }

    yPosition += padding / 2

    // Set up code styling (monospace font like in chat)
    doc.setFont('courier', 'normal')
    doc.setFontSize(baseFontSize - 1)
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])

    // Render code lines without individual backgrounds
    codeLines.forEach((codeLine, index) => {
      // Check if we need a new page for this line
      if (yPosition + lineHeight > pageHeight - margin) {
        // If we need to break, draw a new code block on the next page
        doc.addPage()
        if (themeInfo?.isDark) {
          doc.setFillColor(colors.background[0], colors.background[1], colors.background[2])
          doc.rect(0, 0, pageWidth, pageHeight, 'F')
        }
        yPosition = margin
        
        // Calculate remaining lines
        const remainingLines = codeLines.slice(index)
        const remainingHeight = remainingLines.length * lineHeight + padding
        
        // Draw continuation code block background
        doc.setFillColor(colors.codeBackground[0], colors.codeBackground[1], colors.codeBackground[2])
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.setLineWidth(0.5)
        doc.roundedRect(margin - 5, yPosition - 5, maxWidth + 10, remainingHeight + 10, 6, 6, 'FD')
        
        yPosition += padding / 2
        
        // Reset font settings after page break
        doc.setFont('courier', 'normal')
        doc.setFontSize(baseFontSize - 1)
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      }
      
      // Render the code text (no individual line backgrounds)
      doc.text(codeLine, margin, yPosition)
      yPosition += lineHeight
    })

    yPosition += padding / 2 + 10 // Extra spacing after code block
    
    // Reset font after code block
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(baseFontSize)
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
  }

  // Render blockquotes with left border (like chat interface)
  const renderBlockquote = (text: string, baseFontSize: number) => {
    checkNewPage(30)
    
    // Draw left border (like in chat)
    doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
    doc.setLineWidth(2)
    doc.line(margin, yPosition, margin, yPosition + 20)
    
    // Add quoted text with italic style
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(baseFontSize)
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
    
    const lines = doc.splitTextToSize(text, maxWidth - 15)
    lines.forEach((line: string) => {
      doc.text(line, margin + 10, yPosition)
      yPosition += baseFontSize * 0.7
    })
    
    yPosition += 5
    
    // Reset font after blockquote
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(baseFontSize)
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
  }

  // Enhanced text renderer with bold and italic formatting support
  const renderFormattedText = (text: string, baseFontSize: number) => {
    // Handle markdown formatting with proper regex patterns
    // Process in order of precedence to avoid conflicts
    
    // First handle bold+italic (***text*** or ___text___)
    if (text.includes('***') || text.includes('___')) {
      const boldItalicRegex = /\*\*\*(.*?)\*\*\*|___(.*?)___/g
      const processedText = text.replace(boldItalicRegex, (match, content1, content2) => {
        const content = content1 || content2
        return `__BOLDITALIC_START__${content}__BOLDITALIC_END__`
      })
      
      if (processedText !== text) {
        renderMixedFormattedText(processedText, baseFontSize)
        return
      }
    }
    
    // Then handle bold (**text** or __text__)
    if (text.includes('**') || text.includes('__')) {
      const boldRegex = /\*\*(.*?)\*\*|__(.*?)__/g
      const processedText = text.replace(boldRegex, (match, content1, content2) => {
        const content = content1 || content2
        return `__BOLD_START__${content}__BOLD_END__`
      })
      
      if (processedText !== text) {
        renderMixedFormattedText(processedText, baseFontSize)
        return
      }
    }
    
    // Finally handle italic (*text* or _text_)
    if (text.includes('*') || text.includes('_')) {
      const italicRegex = /(?<!\*)\*([^*\n]+?)\*(?!\*)|(?<!_)_([^_\n]+?)_(?!_)/g
      const processedText = text.replace(italicRegex, (match, content1, content2) => {
        const content = content1 || content2
        return `__ITALIC_START__${content}__ITALIC_END__`
      })
      
      if (processedText !== text) {
        renderMixedFormattedText(processedText, baseFontSize)
        return
      }
    }
    
    // No formatting found, render as normal text
    addText(text, baseFontSize, 'normal', colors.text)
  }
  
     // Helper function to render text with mixed formatting
   const renderMixedFormattedText = (text: string, baseFontSize: number) => {
     const parts = text.split(/(__BOLDITALIC_START__|__BOLDITALIC_END__|__BOLD_START__|__BOLD_END__|__ITALIC_START__|__ITALIC_END__)/)
     
     let currentStyle: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal'
     
     // Track position and render inline
     let hasRenderedAnyPart = false
     
     for (const part of parts) {
       if (part === '__BOLDITALIC_START__') {
         currentStyle = 'bolditalic'
       } else if (part === '__BOLDITALIC_END__') {
         currentStyle = 'normal'
       } else if (part === '__BOLD_START__') {
         currentStyle = 'bold'
       } else if (part === '__BOLD_END__') {
         currentStyle = 'normal'
       } else if (part === '__ITALIC_START__') {
         currentStyle = 'italic'
       } else if (part === '__ITALIC_END__') {
         currentStyle = 'normal'
       } else if (part) {
         // Render the text part with current style
         if (currentStyle === 'bolditalic') {
           // Handle bold+italic manually since addText doesn't support it
           renderBoldItalicText(part, baseFontSize)
         } else {
           // Set font style explicitly before rendering
           doc.setFont('helvetica', currentStyle)
           doc.setFontSize(baseFontSize)
           doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
           
           // Use addText but ensure the font style is maintained
           addText(part, baseFontSize, currentStyle, colors.text)
         }
         hasRenderedAnyPart = true
       }
     }
     
     // Reset font after rendering mixed content
     if (hasRenderedAnyPart) {
       doc.setFont('helvetica', 'normal')
       doc.setFontSize(baseFontSize)
       doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
     }
   }
   
   // Helper function to render bold+italic text
   const renderBoldItalicText = (text: string, baseFontSize: number) => {
     if (!text) return

     doc.setFont('helvetica', 'bolditalic')
     doc.setFontSize(baseFontSize)
     doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])

     const lines = doc.splitTextToSize(text, maxWidth)
     const lineHeight = baseFontSize * 0.7
     const totalHeight = lines.length * lineHeight
     
     checkNewPage(totalHeight + 10)

     lines.forEach((line: string) => {
       checkNewPage(lineHeight + 5)
       doc.text(line, margin, yPosition)
       yPosition += lineHeight
     })
     
     yPosition += baseFontSize * 0.3
   }

  // Enhanced list item renderer with proper indentation and spacing
  const renderListItem = (line: string, baseFontSize: number) => {
    // Calculate indentation level based on leading spaces
    const leadingSpaces = line.length - line.trimStart().length
    const indentLevel = Math.floor(leadingSpaces / 2) // 2 spaces per indent level
    const baseIndent = 20 // Base indentation for lists
    const indentWidth = indentLevel * 15 // Additional indent per level
    
    const trimmedLine = line.trim()
    let listMarker = ''
    let content = ''
    
    if (trimmedLine.match(/^[-*+] /)) {
      // Bullet list
      listMarker = '•'
      content = trimmedLine.substring(2).trim()
    } else if (trimmedLine.match(/^\d+\. /)) {
      // Numbered list
      const match = trimmedLine.match(/^(\d+)\. (.*)/)
      if (match) {
        listMarker = match[1] + '.'
        content = match[2].trim()
      }
    }
    
    if (!content) return
    
    const lineHeight = baseFontSize * 0.7
    const totalIndent = margin + baseIndent + indentWidth
    const contentIndent = totalIndent + 15 // Space after marker
    const availableWidth = maxWidth - baseIndent - indentWidth - 15
    
    checkNewPage(lineHeight + 10)
    
    // Render list marker
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(baseFontSize)
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
    doc.text(listMarker, totalIndent, yPosition)
    
    // Render content with proper wrapping
    const contentLines = doc.splitTextToSize(content, availableWidth)
    
    contentLines.forEach((contentLine: string, index: number) => {
      if (index > 0) {
        yPosition += lineHeight
        checkNewPage(lineHeight + 5)
      }
      doc.text(contentLine, contentIndent, yPosition)
    })
    
    yPosition += lineHeight + (baseFontSize * 0.2) // Slightly less spacing than regular paragraphs
  }

  // Add chat-style header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
  doc.text(thread.title || "Conversation", margin, yPosition)
  yPosition += 25

  // Add creation date
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
  doc.text(`Created: ${new Date(thread.created_at).toLocaleString()}`, margin, yPosition)
  yPosition += 20

  // Add separator line
  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
  doc.setLineWidth(1)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 25

  // Render messages exactly like the chat interface
  messages.forEach((message, index) => {
    const timestamp = new Date(message.created_at).toLocaleString()
    
    if (message.role === "user") {
      renderUserMessage(message.content, timestamp)
    } else {
      renderAssistantMessage(message.content, timestamp)
    }

    // Add reasoning if present (like thinking content in chat)
    if (message.reasoning) {
      checkNewPage(30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
      doc.text("Reasoning:", margin, yPosition)
      yPosition += 12
      
      renderMarkdownContent(message.reasoning, 10)
      yPosition += 10
    }

    // Add spacing between messages (like in chat)
    if (index < messages.length - 1) {
      yPosition += 20
    }
  })

  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}

function generatePlainText(thread: any, messages: any[]) {
  let content = `${thread.title}\n`
  content += `Created: ${new Date(thread.created_at).toLocaleString()}\n\n`
  content += `${"=".repeat(50)}\n\n`

  messages.forEach((message) => {
    const timestamp = new Date(message.created_at).toLocaleString()
    const role = message.role === "user" ? "User" : "Assistant"

    content += `${role} - ${timestamp}\n`
    content += `${"-".repeat(30)}\n`
    content += `${message.content}\n\n`

    if (message.reasoning) {
      content += `Reasoning: ${message.reasoning}\n\n`
    }
  })

  return content
}
