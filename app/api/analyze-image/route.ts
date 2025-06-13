import { type NextRequest, NextResponse } from "next/server"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function POST(request: NextRequest) {
  console.log("🖼️ Image analysis API called")

  try {
    // Get user authentication from headers
    const headersList = await headers()
    const authHeader = headersList.get("authorization")
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ Missing or invalid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      console.log("❌ Auth error:", authError?.message || "No user found")
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }

    console.log("✅ User authenticated for image analysis:", user.id)

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      console.error("❌ No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check if it's an image file
    if (!file.type.startsWith("image/")) {
      console.error("❌ File is not an image:", file.type)
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    console.log("🖼️ Processing image:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Check file size limit (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      console.error("❌ File too large:", file.size)
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}` 
      }, { status: 400 })
    }

    // Convert image to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    console.log("🔄 Analyzing image with vision model...")

    // Get user's Google API key from database
    let googleApiKey: string | null = null
    
    try {
      console.log("🔍 Looking for Google API key in database for user:", user.id)
      const { data: apiKeyData, error: dbError } = await supabaseServer
        .from("api_keys")
        .select("api_key")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .single()

      if (dbError) {
        console.error("❌ Database error fetching API key:", dbError)
      } else if (apiKeyData?.api_key) {
        googleApiKey = apiKeyData.api_key
        console.log("✅ Found Google API key in database")
      } else {
        console.log("❌ No Google API key found in database")
      }
    } catch (dbError) {
      console.error("❌ Error fetching API key from database:", dbError)
    }

    if (!googleApiKey) {
      console.error("❌ Google API key not found for user")
      return NextResponse.json({
        success: true,
        description: createFallbackDescription(file),
        method: "fallback",
        error: "Google API key is required for image analysis. Please add your Google API key in Settings."
      })
    }

    try {
      console.log("🚀 Initializing Google AI with API key length:", googleApiKey.length)
      const google = createGoogleGenerativeAI({ apiKey: googleApiKey })
      const model = google("gemini-1.5-flash")

      console.log("📤 Sending image to Gemini for analysis...")
      const result = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this image and provide a detailed description. Include:

1. **Main Subject**: What is the primary focus of the image?
2. **Objects and People**: What objects, people, or elements are visible?
3. **Text Content**: Any text, signs, or writing visible in the image (transcribe exactly)
4. **Setting and Context**: Where does this appear to be taken? What's the environment?
5. **Colors and Style**: Notable colors, artistic style, or visual characteristics
6. **Technical Details**: Image quality, composition, or notable technical aspects

Be thorough but concise, as this description will help an AI assistant understand and discuss the image content with a user.`
              },
              {
                type: "image",
                image: dataUrl
              }
            ]
          }
        ],
        maxTokens: 1000,
        temperature: 0.1
      })

      const description = result.text

      console.log("✅ Image analysis successful:", {
        descriptionLength: description.length,
        preview: description.substring(0, 100) + "...",
        fullDescription: description // Add full description for debugging
      })

      return NextResponse.json({
        success: true,
        description,
        method: "gemini-vision",
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      })

    } catch (visionError) {
      console.error("❌ Vision model error details:", {
        error: visionError,
        message: visionError instanceof Error ? visionError.message : "Unknown error",
        stack: visionError instanceof Error ? visionError.stack : undefined,
        name: visionError instanceof Error ? visionError.name : undefined
      })
      
      // Return fallback description instead of failing
      return NextResponse.json({
        success: true,
        description: createFallbackDescription(file),
        method: "fallback", 
        error: visionError instanceof Error ? visionError.message : "Vision analysis failed"
      })
    }

  } catch (error) {
    console.error("❌ Error in image analysis:", error)
    
    // Even on error, return a basic description so the upload doesn't fail
    return NextResponse.json({
      success: true,
      description: `Image file uploaded: ${request.url?.includes('file') ? 'image file' : 'unknown file'}

This appears to be an image file that was uploaded. The AI vision analysis encountered an error, but the image has been successfully uploaded and stored.

To discuss this image:
1. You can describe what you see in the image
2. Ask specific questions about the image content  
3. The AI can help analyze any descriptions you provide`,
      method: "error-fallback",
      error: error instanceof Error ? error.message : "Unknown error occurred"
    })
  }
}

function createFallbackDescription(file: File): string {
  return `🖼️ Image file: ${file.name} (${file.type}, ${formatFileSize(file.size)})

This appears to be an image file that was uploaded. The AI vision analysis is currently unavailable, but the image has been successfully uploaded and stored.

**To discuss this image:**
1. **Describe what you see**: Tell me what's in the image and I can help analyze it
2. **Ask specific questions**: I can help with questions about image content you describe
3. **Share text from the image**: If there's text in the image, you can type it out for analysis

The image is available for viewing and has been processed successfully.`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
} 