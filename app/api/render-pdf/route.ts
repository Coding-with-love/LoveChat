import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🔄 PDF rendering API called")

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      console.error("❌ No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("📄 Processing PDF for rendering:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    console.log("🔍 PDF file header check:", {
      header: Array.from(uint8Array.slice(0, 10))
        .map((b) => String.fromCharCode(b))
        .join(""),
      isPdf: uint8Array.slice(0, 4).every((byte, i) => byte === "%PDF".charCodeAt(i)),
    })

    try {
      // Method 1: Try with pdf-parse (server-compatible)
      console.log("🔄 Attempting PDF rendering with pdf-parse...")
      const pdfParseResult = await renderWithPdfParse(uint8Array)
      if (pdfParseResult.success && pdfParseResult.text && pdfParseResult.text.trim().length > 10) {
        console.log("✅ pdf-parse extraction successful:", {
          textLength: pdfParseResult.text.length,
          pages: pdfParseResult.pages,
        })
        return NextResponse.json({
          success: true,
          text: pdfParseResult.text,
          pages: pdfParseResult.pages,
          method: "pdf-parse",
        })
      }
    } catch (parseError) {
      console.warn("⚠️ pdf-parse failed:", parseError)
    }

    try {
      // Method 2: Try with server-compatible PDF.js
      console.log("🔄 Attempting PDF rendering with server PDF.js...")
      const pdfjsResult = await renderWithServerPdfJs(uint8Array)
      if (pdfjsResult.success && pdfjsResult.text && pdfjsResult.text.trim().length > 10) {
        console.log("✅ Server PDF.js extraction successful:", {
          textLength: pdfjsResult.text.length,
          pages: pdfjsResult.pages,
        })
        return NextResponse.json({
          success: true,
          text: pdfjsResult.text,
          pages: pdfjsResult.pages,
          method: "server-pdfjs",
        })
      }
    } catch (pdfjsError) {
      console.warn("⚠️ Server PDF.js failed:", pdfjsError)
    }

    try {
      // Method 3: Try with custom PDF renderer
      console.log("🔄 Attempting custom PDF rendering...")
      const customResult = await renderWithCustomParser(uint8Array)
      if (customResult.success && customResult.text && customResult.text.trim().length > 10) {
        console.log("✅ Custom parser extraction successful:", {
          textLength: customResult.text.length,
        })
        return NextResponse.json({
          success: true,
          text: customResult.text,
          pages: customResult.pages || 1,
          method: "custom",
        })
      }
    } catch (customError) {
      console.warn("⚠️ Custom parser failed:", customError)
    }

    // If all methods failed
    console.error("❌ All PDF rendering methods failed")
    return NextResponse.json({
      success: false,
      error: "Unable to extract text from PDF. The PDF may be image-based or use unsupported encoding.",
      suggestions: [
        "Try opening the PDF and copying text manually",
        "Convert the PDF to a text file",
        "Use OCR software if the PDF contains scanned images",
      ],
    })
  } catch (error) {
    console.error("❌ General error in PDF rendering:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    })
  }
}

// Method 1: Use pdf-parse (most reliable for server)
async function renderWithPdfParse(data: Uint8Array) {
  try {
    const pdfParse = (await import("pdf-parse")).default
    const buffer = Buffer.from(data)

    console.log("📖 Parsing PDF with pdf-parse...")
    const pdfData = await pdfParse(buffer, {
      max: 0, // Parse all pages
      version: "default",
    })

    console.log("📊 pdf-parse results:", {
      pages: pdfData.numpages,
      textLength: pdfData.text?.length || 0,
      hasText: !!pdfData.text?.trim(),
    })

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error("No text content extracted")
    }

    const cleanedText = cleanExtractedText(pdfData.text)

    return {
      success: true,
      text: cleanedText,
      pages: pdfData.numpages,
    }
  } catch (error) {
    console.error("❌ pdf-parse rendering failed:", error)
    throw error
  }
}

// Method 2: Use PDF.js in server mode (without DOM dependencies)
async function renderWithServerPdfJs(data: Uint8Array) {
  try {
    // Import PDF.js for server use
    const pdfjsLib = await import("pdfjs-dist/build/pdf.js")

    // Set up for server environment (no DOM)
    const { NodeCanvasFactory, NodeCMapReaderFactory } = await import("pdfjs-dist/build/pdf.js")

    console.log("📚 Loading PDF document with server PDF.js...")
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
      canvasFactory: new NodeCanvasFactory(),
      cMapReaderFactory: new NodeCMapReaderFactory({
        baseUrl: "./node_modules/pdfjs-dist/cmaps/",
        isCompressed: true,
      }),
    })

    const pdfDocument = await loadingTask.promise
    console.log(`📄 PDF loaded successfully. Pages: ${pdfDocument.numPages}`)

    let fullText = ""

    // Process each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      console.log(`🔍 Processing page ${pageNum}/${pdfDocument.numPages}`)

      try {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent({
          includeMarkedContent: false,
          disableNormalization: false,
        })

        // Extract text items and reconstruct readable text
        let pageText = ""
        let lastY = null

        for (const item of textContent.items) {
          if ("str" in item && item.str) {
            // Add line breaks when Y position changes significantly
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
              pageText += "\n"
            }

            pageText += item.str

            // Add space if needed
            if (item.hasEOL) {
              pageText += "\n"
            } else if (item.width && item.width > 0) {
              pageText += " "
            }

            lastY = item.transform[5]
          }
        }

        if (pageText.trim()) {
          fullText += `${pageText.trim()}\n\n`
        }

        console.log(`✅ Page ${pageNum} processed. Text length: ${pageText.length}`)
      } catch (pageError) {
        console.warn(`⚠️ Error processing page ${pageNum}:`, pageError)
      }
    }

    // Clean up the extracted text
    const cleanedText = cleanExtractedText(fullText)

    return {
      success: true,
      text: cleanedText,
      pages: pdfDocument.numPages,
    }
  } catch (error) {
    console.error("❌ Server PDF.js rendering failed:", error)
    throw error
  }
}

// Method 3: Custom PDF parser for basic text extraction
async function renderWithCustomParser(data: Uint8Array) {
  try {
    console.log("🔧 Attempting custom PDF parsing...")

    // Convert to string to search for text patterns
    const pdfString = Array.from(data)
      .map((byte) => String.fromCharCode(byte))
      .join("")

    // Look for text objects in the PDF
    const textMatches = []

    // Pattern 1: Look for (text) patterns
    const textPattern1 = /$$([^)]+)$$/g
    let match1
    while ((match1 = textPattern1.exec(pdfString)) !== null) {
      const text = match1[1]
      if (text.length > 2 && /[a-zA-Z]/.test(text)) {
        textMatches.push(text)
      }
    }

    // Pattern 2: Look for Tj operators (show text)
    const textPattern2 = /$$([^)]*)$$\s*Tj/g
    let match2
    while ((match2 = textPattern2.exec(pdfString)) !== null) {
      const text = match2[1]
      if (text.length > 1 && /[a-zA-Z]/.test(text)) {
        textMatches.push(text)
      }
    }

    // Pattern 3: Look for TJ operators (show text with positioning)
    const textPattern3 = /\[\s*$$([^)]*)$$\s*\]\s*TJ/g
    let match3
    while ((match3 = textPattern3.exec(pdfString)) !== null) {
      const text = match3[1]
      if (text.length > 1 && /[a-zA-Z]/.test(text)) {
        textMatches.push(text)
      }
    }

    if (textMatches.length === 0) {
      throw new Error("No text patterns found in PDF")
    }

    // Join the extracted text
    const extractedText = textMatches.join(" ")
    const cleanedText = cleanExtractedText(extractedText)

    console.log(`🔧 Custom parser found ${textMatches.length} text fragments`)

    return {
      success: true,
      text: cleanedText,
      pages: 1,
    }
  } catch (error) {
    console.error("❌ Custom parser failed:", error)
    throw error
  }
}

// Helper function to clean extracted text
function cleanExtractedText(text: string): string {
  if (!text) return ""

  return (
    text
      // Remove null bytes and control characters
      .replace(/\u0000/g, "")
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\uFFFD/g, "")
      // Normalize whitespace but preserve line breaks
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      // Remove PDF artifacts
      .replace(/\/[A-Z][A-Za-z0-9]*\s/g, "")
      .replace(/\d+\s+\d+\s+obj/g, "")
      .replace(/endobj/g, "")
      .replace(/stream\s*$/gm, "")
      .replace(/endstream/g, "")
      // Clean up spacing
      .trim()
  )
}
