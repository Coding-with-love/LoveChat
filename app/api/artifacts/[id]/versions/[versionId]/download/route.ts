import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
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

    // First verify the artifact belongs to the user
    const { data: artifact, error: artifactError } = await supabaseServer
      .from("artifacts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (artifactError) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    // Get the specific version
    const { data: version, error: versionError } = await supabaseServer
      .from("artifact_versions")
      .select("*")
      .eq("id", params.versionId)
      .eq("artifact_id", params.id)
      .single()

    if (versionError) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    // Determine file extension and content type
    let fileExtension = artifact.file_extension || getFileExtension(artifact.content_type, artifact.language)
    let contentType = getContentType(artifact.content_type, artifact.language)
    
    // Create filename with version number
    const sanitizedTitle = artifact.title.replace(/[^a-zA-Z0-9\-_]/g, '_')
    const filename = `${sanitizedTitle}_v${version.version}.${fileExtension}`

    // Create response with version content
    const response = new NextResponse(version.content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(version.content, 'utf8').toString(),
      },
    })

    return response
  } catch (error) {
    console.error("Download version API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getFileExtension(contentType: string, language?: string): string {
  // Use language first if available
  if (language) {
    const languageExtensions: Record<string, string> = {
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'cs',
      'php': 'php',
      'ruby': 'rb',
      'go': 'go',
      'rust': 'rs',
      'swift': 'swift',
      'kotlin': 'kt',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yml',
      'yml': 'yml',
      'sql': 'sql',
      'bash': 'sh',
      'shell': 'sh',
      'powershell': 'ps1',
      'dockerfile': 'dockerfile',
      'markdown': 'md',
      'md': 'md'
    }
    
    if (languageExtensions[language.toLowerCase()]) {
      return languageExtensions[language.toLowerCase()]
    }
  }

  // Fall back to content type
  const contentTypeExtensions: Record<string, string> = {
    'code': 'txt',
    'text': 'txt',
    'markdown': 'md',
    'md': 'md',
    'javascript': 'js',
    'typescript': 'ts',
    'python': 'py',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yml',
    'sql': 'sql'
  }

  return contentTypeExtensions[contentType.toLowerCase()] || 'txt'
}

function getContentType(contentType: string, language?: string): string {
  // Use language first if available
  if (language) {
    const languageContentTypes: Record<string, string> = {
      'javascript': 'application/javascript',
      'typescript': 'application/typescript',
      'python': 'text/x-python',
      'java': 'text/x-java-source',
      'cpp': 'text/x-c++src',
      'c': 'text/x-csrc',
      'csharp': 'text/x-csharp',
      'php': 'application/x-php',
      'ruby': 'application/x-ruby',
      'go': 'text/x-go',
      'rust': 'text/x-rust',
      'swift': 'text/x-swift',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
      'xml': 'application/xml',
      'yaml': 'application/x-yaml',
      'yml': 'application/x-yaml',
      'sql': 'application/sql',
      'bash': 'application/x-sh',
      'shell': 'application/x-sh',
      'markdown': 'text/markdown',
      'md': 'text/markdown'
    }
    
    if (languageContentTypes[language.toLowerCase()]) {
      return languageContentTypes[language.toLowerCase()]
    }
  }

  // Fall back to content type
  const contentTypes: Record<string, string> = {
    'markdown': 'text/markdown',
    'md': 'text/markdown',
    'javascript': 'application/javascript',
    'typescript': 'application/typescript',
    'python': 'text/x-python',
    'html': 'text/html',
    'css': 'text/css',
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'application/x-yaml',
    'sql': 'application/sql'
  }

  return contentTypes[contentType.toLowerCase()] || 'text/plain'
} 