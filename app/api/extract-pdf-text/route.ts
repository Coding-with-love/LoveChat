import { type NextRequest, NextResponse } from "next/server"
import { Buffer } from "buffer"

export async function POST(request: NextRequest) {
  console.log("🔄 Direct PDF text extraction API called")

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      console.error("❌ No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("📄 Processing PDF:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check if this is a PDF file by looking at the header
    const isPdf = buffer.slice(0, 5).toString() === "%PDF-"
    if (!isPdf) {
      console.error("❌ Not a valid PDF file")
      return NextResponse.json({ error: "Not a valid PDF file" }, { status: 400 })
    }

    try {
      // Try to dynamically import pdf-parse
      console.log("📦 Loading pdf-parse library...")
      const pdfParse = (await import("pdf-parse")).default

      console.log("🔍 Parsing PDF...")
      const data = await pdfParse(buffer)

      // Get the raw text
      const rawText = data.text || ""
      console.log("📝 Raw text extracted:", {
        length: rawText.length,
        preview: rawText.substring(0, 200) + "...",
      })

      // Return the raw text directly
      return NextResponse.json({
        success: true,
        text: rawText,
        pages: data.numpages,
      })
    } catch (parseError) {
      console.error("❌ Error parsing PDF:", parseError)
      return NextResponse.json({
        success: false,
        error: parseError instanceof Error ? parseError.message : "Unknown parsing error",
      })
    }
  } catch (error) {
    console.error("❌ General error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
