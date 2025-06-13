import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { data: artifact, error } = await supabaseServer
      .from("artifacts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching artifact:", error)
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    // Determine file extension and MIME type
    const getFileInfo = (contentType: string, language?: string, fileExtension?: string) => {
      if (fileExtension) {
        return {
          extension: fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`,
          mimeType: getMimeType(fileExtension)
        }
      }

      if (language) {
        const ext = getExtensionFromLanguage(language)
        return {
          extension: ext,
          mimeType: getMimeType(ext)
        }
      }

      switch (contentType) {
        case 'javascript':
        case 'js':
          return { extension: '.js', mimeType: 'application/javascript' }
        case 'typescript':
        case 'ts':
          return { extension: '.ts', mimeType: 'application/typescript' }
        case 'python':
        case 'py':
          return { extension: '.py', mimeType: 'text/x-python' }
        case 'html':
          return { extension: '.html', mimeType: 'text/html' }
        case 'css':
          return { extension: '.css', mimeType: 'text/css' }
        case 'json':
          return { extension: '.json', mimeType: 'application/json' }
        case 'markdown':
        case 'md':
          return { extension: '.md', mimeType: 'text/markdown' }
        default:
          return { extension: '.txt', mimeType: 'text/plain' }
      }
    }

    const { extension, mimeType } = getFileInfo(artifact.content_type, artifact.language, artifact.file_extension)
    const filename = `${artifact.title.replace(/[^a-zA-Z0-9-_]/g, '_')}${extension}`

    return new Response(artifact.content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(artifact.content, 'utf8').toString()
      }
    })
  } catch (error) {
    console.error("Download artifact API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getMimeType(extension: string): string {
  const ext = extension.toLowerCase().replace('.', '')
  const mimeTypes: Record<string, string> = {
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'py': 'text/x-python',
    'html': 'text/html',
    'css': 'text/css',
    'json': 'application/json',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'xml': 'application/xml',
    'sql': 'application/sql',
    'sh': 'application/x-sh',
    'yml': 'application/x-yaml',
    'yaml': 'application/x-yaml'
  }
  return mimeTypes[ext] || 'text/plain'
}

function getExtensionFromLanguage(language: string): string {
  const extensions: Record<string, string> = {
    'javascript': '.js',
    'typescript': '.ts',
    'python': '.py',
    'html': '.html',
    'css': '.css',
    'json': '.json',
    'markdown': '.md',
    'sql': '.sql',
    'shell': '.sh',
    'bash': '.sh',
    'yaml': '.yml',
    'xml': '.xml'
  }
  return extensions[language.toLowerCase()] || '.txt'
}
