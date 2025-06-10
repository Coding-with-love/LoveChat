// Debug utility to test file upload functionality
export async function debugFileUpload(file: File) {
    console.log("🔍 DEBUG: Starting file upload debug")
    console.log("📁 File details:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    })
  
    // Test text extraction
    try {
      console.log("📝 Testing text extraction...")
      const content = await file.text()
      console.log("✅ Text extraction successful:", {
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + "...",
        firstLine: content.split("\n")[0],
        lineCount: content.split("\n").length,
      })
      return content
    } catch (error) {
      console.error("❌ Text extraction failed:", error)
      return null
    }
  }
  
  // Test function to verify file processing
  export function testFileProcessing() {
    console.log("🧪 File processing test utilities loaded")
  
    // Add to window for browser console testing
    if (typeof window !== "undefined") {
      ;(window as any).debugFileUpload = debugFileUpload
      console.log("🌐 Added debugFileUpload to window for testing")
    }
  }
  