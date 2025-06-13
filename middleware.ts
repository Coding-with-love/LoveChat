import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const searchParams = request.nextUrl.searchParams.toString()
  const fullUrl = `${pathname}${searchParams ? `?${searchParams}` : ""}`

  console.log("🔍 Middleware triggered for:", fullUrl)
  console.log("🔍 Request method:", request.method)

  // Skip authentication for shared conversation API routes
  if (pathname.startsWith("/api/shared/")) {
    console.log("⏭️ Skipping authentication for shared API route:", fullUrl)
    return NextResponse.next()
  }

  // Only apply middleware to specific API routes that need authentication
  const protectedRoutes = [
    "/api/chat",
    "/api/completion",
    "/api/test-auth",
    "/api/search",
    "/api/mark-interrupted",
    "/api/resume-stream",
    "/api/resumable-streams",
    "/api/test-resumable",
    "/api/convert-code",
    "/api/explain-code",
    "/api/personas",
    "/api/prompt-templates",
    "/api/summarize-conversation",
    "/api/export-conversation",
    "/api/code-conversions", // Add our new API route
  ]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute) {
    console.log("🔐 Checking authentication for API route:", fullUrl)

    const authHeader = request.headers.get("authorization")
    console.log("📋 Auth header present:", !!authHeader)

    if (authHeader) {
      console.log("📋 Auth header preview:", `${authHeader.substring(0, 20)}...`)
    }

    if (!authHeader?.startsWith("Bearer ")) {
      console.log("❌ Missing or invalid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log("🎫 Token extracted, length:", token.length)

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token)

      if (error) {
        console.log("❌ Auth error:", error.message)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }

      if (!user) {
        console.log("❌ No user found")
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
      }

      console.log("✅ User authenticated:", user.id)

      // Add user info to request headers for use in API routes
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-user-id", user.id)
      requestHeaders.set("x-user-email", user.email || "")

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      console.error("💥 Middleware error:", error)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  }

  console.log("⏭️ Skipping middleware for:", fullUrl)
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Explicitly match our protected API routes
    "/api/chat/:path*",
    "/api/completion/:path*",
    "/api/test-auth/:path*",
    "/api/search/:path*",
    "/api/mark-interrupted/:path*",
    "/api/resume-stream/:path*",
    "/api/resumable-streams/:path*",
    "/api/test-resumable/:path*",
    "/api/convert-code/:path*",
    "/api/explain-code/:path*",
    "/api/personas/:path*",
    "/api/prompt-templates/:path*",
    "/api/summarize-conversation/:path*",
    "/api/export-conversation/:path*",
    "/api/code-conversions/:path*", // Add our new API route
    // Also match without path parameters
    "/api/chat",
    "/api/completion",
    "/api/test-auth",
    "/api/search",
    "/api/mark-interrupted",
    "/api/resume-stream",
    "/api/resumable-streams",
    "/api/test-resumable",
    "/api/convert-code",
    "/api/explain-code",
    "/api/personas",
    "/api/prompt-templates",
    "/api/summarize-conversation",
    "/api/export-conversation",
    "/api/code-conversions", // Add our new API route
    // Include shared API routes for processing but they'll be skipped in middleware
    "/api/shared/:path*",
  ],
}
