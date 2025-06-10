import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🔄 Google Docs PDF parsing API called")

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("📄 Processing Google Docs PDF:", file.name)

    // Read the file as text to look for patterns
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // Convert to string for pattern matching
    const pdfString = Array.from(uint8Array)
      .map((byte) => String.fromCharCode(byte))
      .join("")

    console.log("🔍 Analyzing PDF structure...")

    // Look for Google Docs specific patterns
    const isGoogleDocs = pdfString.includes("Google Docs") || pdfString.includes("Mozilla/5.0")
    console.log("📊 Google Docs PDF detected:", isGoogleDocs)

    // Extract text using multiple methods
    const extractedTexts = []

    // Method 1: Look for text in parentheses (most common in PDFs)
    const textInParens = extractTextInParentheses(pdfString)
    if (textInParens.length > 0) {
      extractedTexts.push(...textInParens)
    }

    // Method 2: Look for text with Tj operators
    const textWithTj = extractTextWithTjOperators(pdfString)
    if (textWithTj.length > 0) {
      extractedTexts.push(...textWithTj)
    }

    // Method 3: Look for text in arrays with TJ operators
    const textWithTJ = extractTextWithTJOperators(pdfString)
    if (textWithTJ.length > 0) {
      extractedTexts.push(...textWithTJ)
    }

    // Method 4: Look for text after BT (Begin Text) operators
    const textAfterBT = extractTextAfterBT(pdfString)
    if (textAfterBT.length > 0) {
      extractedTexts.push(...textAfterBT)
    }

    console.log(`🔍 Found ${extractedTexts.length} text fragments`)

    if (extractedTexts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No readable text found in PDF",
        debug: {
          isGoogleDocs,
          pdfSize: pdfString.length,
          hasTextMarkers: pdfString.includes("Tj") || pdfString.includes("TJ"),
        },
      })
    }

    // Clean and join the extracted text
    const cleanedTexts = extractedTexts
      .map(cleanText)
      .filter((text) => text.length > 0)
      .filter((text, index, array) => array.indexOf(text) === index) // Remove duplicates

    const finalText = cleanedTexts.join(" ")

    console.log("✅ Text extraction successful:", {
      fragmentsFound: extractedTexts.length,
      cleanedFragments: cleanedTexts.length,
      finalTextLength: finalText.length,
    })

    return NextResponse.json({
      success: true,
      text: finalText,
      method: "google-docs-parser",
      debug: {
        isGoogleDocs,
        fragmentsFound: extractedTexts.length,
        cleanedFragments: cleanedTexts.length,
      },
    })
  } catch (error) {
    console.error("❌ Error parsing Google Docs PDF:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

function extractTextInParentheses(pdfString: string): string[] {
  const texts = []
  const regex = /$$([^)]+)$$/g
  let match

  while ((match = regex.exec(pdfString)) !== null) {
    const text = match[1]
    if (text && text.length > 1 && /[a-zA-Z]/.test(text)) {
      texts.push(text)
    }
  }

  return texts
}

function extractTextWithTjOperators(pdfString: string): string[] {
  const texts = []
  const regex = /$$([^)]*)$$\s*Tj/g
  let match

  while ((match = regex.exec(pdfString)) !== null) {
    const text = match[1]
    if (text && text.length > 0 && /[a-zA-Z]/.test(text)) {
      texts.push(text)
    }
  }

  return texts
}

function extractTextWithTJOperators(pdfString: string): string[] {
  const texts = []
  const regex = /\[\s*$$([^)]*)$$\s*\]\s*TJ/g
  let match

  while ((match = regex.exec(pdfString)) !== null) {
    const text = match[1]
    if (text && text.length > 0 && /[a-zA-Z]/.test(text)) {
      texts.push(text)
    }
  }

  return texts
}

function extractTextAfterBT(pdfString: string): string[] {
  const texts = []
  const btSections = pdfString.split("BT")

  for (let i = 1; i < btSections.length; i++) {
    const section = btSections[i]
    const etIndex = section.indexOf("ET")
    if (etIndex !== -1) {
      const textSection = section.substring(0, etIndex)
      const textMatches = textSection.match(/$$([^)]+)$$/g)
      if (textMatches) {
        for (const match of textMatches) {
          const text = match.slice(1, -1) // Remove parentheses
          if (text && text.length > 1 && /[a-zA-Z]/.test(text)) {
            texts.push(text)
          }
        }
      }
    }
  }

  return texts
}

function cleanText(text: string): string {
  return text
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
