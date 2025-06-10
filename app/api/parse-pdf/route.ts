import { type NextRequest, NextResponse } from "next/server"
import { Buffer } from "buffer"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { v4 as uuidv4 } from "uuid"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// Define a fallback message for when text extraction fails
const FALLBACK_MESSAGE = (fileName: string, fileSize: number) => `📄 **PDF Document: ${fileName}**

**File Details:**
- Size: ${formatFileSize(fileSize)}
- Type: PDF Document
- Status: Successfully uploaded (text extraction had issues)

**To discuss this PDF content:**
1. **Copy and paste text**: Open the PDF and copy the sections you want to discuss
2. **Describe the content**: Tell me what type of document this is and what you'd like to know
3. **Ask specific questions**: I can help analyze any text you share from the document

The PDF file has been saved and is available, but I need you to share the text content for me to analyze it.`

export async function POST(request: NextRequest) {
  console.log("🔄 PDF parsing API called")
  
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      console.error("❌ No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    
    if (file.type !== "application/pdf") {
      console.error("❌ File is not a PDF:", file.type)
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }
    
    console.log("📄 Processing PDF:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Try multiple methods to extract text
    const results = await Promise.allSettled([
      extractTextWithPdfParse(buffer),
      extractTextWithPdfToText(buffer, file.name),
    ])
    
    console.log("📊 Extraction results:", results.map(r => r.status))
    
    // Find the first successful result
    const successfulResult = results.find(r => r.status === "fulfilled" && r.value.success)
    
    if (successfulResult && successfulResult.status === "fulfilled") {
      const { text, pages } = successfulResult.value
      
      if (text && text.trim()) {
        console.log("✅ Successfully extracted text:", {
          method: successfulResult.value.method,
          textLength: text.length,
          pages,
        })
        
        return NextResponse.json({
          success: true,
          text,
          pages,
          method: successfulResult.value.method,
        })
      }
    }
    
    // If we get here, all methods failed or returned empty text
    console.error("❌ All text extraction methods failed")
    
    // Collect error messages from all methods
    const errorMessages = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map(r => r.reason)
      .concat(
        results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && !r.value.success)
          .map(r => r.value.error)
      )
    
    console.error("❌ Extraction errors:", errorMessages)
    
    return NextResponse.json({
      success: true, // Still return success to avoid blocking the upload
      text: FALLBACK_MESSAGE(file.name, file.size),
      pages: 1,
      errors: errorMessages,
    })
  } catch (error) {
    console.error("❌ General error in PDF parsing:", error)
    
    return NextResponse.json({
      success: true, // Still return success to avoid blocking the upload
      text: FALLBACK_MESSAGE("document.pdf", 0),
      pages: 1,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * Extract text using pdf-parse library
 */
async function extractTextWithPdfParse(buffer: Buffer): Promise<{ success: boolean; text?: string; pages?: number; method: string; error?: string }> {
  try {
    console.log("🔍 Attempting extraction with pdf-parse...")
    
    // Try to dynamically import pdf-parse
    let pdfParse: any
    try {
      const module = await import("pdf-parse")
      pdfParse = module.default
    } catch (importError) {
      console.error("❌ Failed to import pdf-parse:", importError)
      return {
        success: false,
        method: "pdf-parse",
        error: importError instanceof Error ? importError.message : "Failed to import pdf-parse",
      }
    }
    
    // Parse the PDF
    const data = await pdfParse(buffer, {
      max: 0, // Parse all pages
      pagerender: renderPage, // Custom page renderer
    })
    
    const text = data.text || ""
    
    console.log("📝 pdf-parse extraction result:", {
      textLength: text.length,
      pages: data.numpages,
      hasText: !!text.trim(),
    })
    
    // Check if the extracted text looks like raw PDF data
    if (isProbablyRawPdfData(text)) {
      console.warn("⚠️ pdf-parse returned what appears to be raw PDF data")
      return {
        success: false,
        method: "pdf-parse",
        error: "Extracted text appears to be raw PDF data",
      }
    }
    
    return {
      success: true,
      text: cleanTextContent(text),
      pages: data.numpages,
      method: "pdf-parse",
    }
  } catch (error) {
    console.error("❌ Error in pdf-parse extraction:", error)
    return {
      success: false,
      method: "pdf-parse",
      error: error instanceof Error ? error.message : "Unknown error in pdf-parse",
    }
  }
}

/**
 * Extract text using pdftotext command-line tool if available
 */
async function extractTextWithPdfToText(buffer: Buffer, fileName: string): Promise<{ success: boolean; text?: string; pages?: number; method: string; error?: string }> {
  try {
    console.log("🔍 Attempting extraction with pdftotext...")
    
    // Create temporary files
    const tempDir = os.tmpdir()
    const tempPdfPath = path.join(tempDir, `${uuidv4()}-${fileName}`)
    const tempTxtPath = path.join(tempDir, `${uuidv4()}-output.txt`)
    
    // Write buffer to temporary PDF file
    fs.writeFileSync(tempPdfPath, buffer)
    
    try {
      // Try to execute pdftotext (part of poppler-utils)
      await execAsync(`pdftotext -layout "${tempPdfPath}" "${tempTxtPath}"`)
      
      // Read the output text file
      const text = fs.readFileSync(tempTxtPath, "utf8")
      
      console.log("📝 pdftotext extraction result:", {
        textLength: text.length,
        hasText: !!text.trim(),
      })
      
      // Clean up temporary files
      try {
        fs.unlinkSync(tempPdfPath)
        fs.unlinkSync(tempTxtPath)
      } catch (cleanupError) {
        console.warn("⚠️ Failed to clean up temporary files:", cleanupError)
      }
      
      return {
        success: true,
        text: cleanTextContent(text),
        pages: countPagesInText(text),
        method: "pdftotext",
      }
    } catch (execError) {
      console.warn("⚠️ pdftotext execution failed:", execError)
      
      // Clean up temporary files
      try {
        fs.unlinkSync(tempPdfPath)
        if (fs.existsSync(tempTxtPath)) {
          fs.unlinkSync(tempTxtPath)
        }
      } catch (cleanupError) {
        console.warn("⚠️ Failed to clean up temporary files:", cleanupError)
      }
      
      return {
        success: false,
        method: "pdftotext",
        error: "pdftotext command failed or is not installed",
      }
    }
  } catch (error) {
    console.error("❌ Error in pdftotext extraction:", error)
    return {
      success: false,
      method: "pdftotext",
      error: error instanceof Error ? error.message : "Unknown error in pdftotext",
    }
  }
}

/**
 * Custom page renderer for pdf-parse
 */
function renderPage(pageData: any) {
  // Check if the page has content
  if (!pageData.getTextContent) {
    return Promise.resolve("")
  }
  
  return pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  }).then((textContent: any) => {
    let lastY = -1
    let text = ""
    
    // Process each text item
    for (const item of textContent.items) {
      if (lastY !== item.transform[5]) {
        text += "\n"
        lastY = item.transform[5]
      }
      text += item.str
    }
    
    return text
  })
}

/**
 * Check if the extracted text looks like raw PDF data
 */
function isProbablyRawPdfData(text: string): boolean {
  const lowerText = text.toLowerCase()
  
  // Check for common PDF structure markers
  const pdfMarkers = [
    "%pdf-",
    "endobj",
    "xref",
    "trailer",
    "startxref",
    "/type /",
    "/filter /",
    "stream\n",
    "\nendstream",
  ]
  
  // Count how many markers are found
  const markerCount = pdfMarkers.filter(marker => lowerText.includes(marker)).length
  
  // If more than 3 markers are found, it's likely raw PDF data
  return markerCount >= 3
}

/**
 * Count approximate number of pages based on text content
 */
function countPagesInText(text: string): number {
  // Simple heuristic: assume a page break every ~3000 characters
  return Math.max(1, Math.ceil(text.length / 3000))
}

/**
 * Clean and normalize text content
 */
function cleanTextContent(text: string): string {
  if (!text) return ""
  
  return text
    .replace(/\u0000/g, "") // Remove null bytes
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Remove control chars
    .replace(/\uFFFD/g, "") // Remove replacement character
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/[ \t]+/g, " ") // Normalize spaces and tabs
    .replace(/\n{3,}/g, "\n\n") // Normalize multiple line breaks
    .trim()
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
