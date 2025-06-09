import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Server-side function to get user from headers
export async function getUserFromHeaders(headers: Headers) {
  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return (await cookieStore).get(name)?.value
          },
        },
      },
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Failed to get user from headers:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("getUserFromHeaders error:", error)
    return null
  }
}

// Alternative server-side function using authorization header
export async function getUserFromAuthHeader(authHeader: string) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.replace("Bearer ", "")

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() {
            return undefined
          },
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error) {
      console.error("Failed to get user from auth header:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("getUserFromAuthHeader error:", error)
    return null
  }
}
