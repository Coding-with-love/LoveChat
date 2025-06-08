import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role key for API routes
export const supabaseServer = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Helper function to get user from request headers (set by middleware)
export function getUserFromHeaders(req: Request) {
  const userId = req.headers.get("x-user-id")
  const userEmail = req.headers.get("x-user-email")

  if (!userId) {
    return null
  }

  return {
    id: userId,
    email: userEmail || "",
  }
}

// Legacy function for backward compatibility
export async function getUserFromRequest(req: Request) {
  // First try to get from headers (set by middleware)
  const userFromHeaders = getUserFromHeaders(req)
  if (userFromHeaders) {
    return userFromHeaders
  }

  // Fallback to token verification
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user
}
