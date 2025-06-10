import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Simple PDF parsing API called")

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

    // For this simple version, we'll just return a message asking the user to copy-paste the content
    return NextResponse.json({
      success: true,
      text: `📄 **PDF Document: ${file.name}**

I've received your PDF file (${formatFileSize(file.size)}), but I'm unable to automatically extract the text content.

**To discuss this document:**
- Open the PDF and copy/paste specific sections you'd like to discuss
- Describe what you see in the document
- Ask specific questions about the content

The file has been uploaded successfully.`,
      pages: 1,
    })
  } catch (error) {
    console.error("❌ Error in simple PDF parsing:", error)

    return NextResponse.json({
      success: true,
      text: `📄 **PDF Document Uploaded**

The PDF file was uploaded successfully, but I'm unable to automatically extract the text.

**To analyze this document:**
1. Open the PDF and copy the text you want to discuss
2. Paste the relevant sections in our conversation
3. I can then help analyze and answer questions about the content`,
      pages: 1,
    })
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
