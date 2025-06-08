import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const { token } = params
    const headersList = headers()
    const password = (await headersList).get("x-share-password")

    console.log("🔍 Fetching shared conversation:", token)

    // Use the service role client to bypass RLS for public shares
    const { data: sharedThread, error } = await supabaseServer
      .from("shared_threads")
      .select("*")
      .eq("share_token", token)
      .single()

    if (error) {
      console.error("❌ Error fetching shared thread:", error)
      return NextResponse.json({ error: "Shared conversation not found" }, { status: 404 })
    }

    if (!sharedThread) {
      return NextResponse.json({ error: "Shared conversation not found" }, { status: 404 })
    }

    // Check if expired
    if (sharedThread.expires_at && new Date(sharedThread.expires_at) < new Date()) {
      return NextResponse.json({ error: "This shared conversation has expired" }, { status: 410 })
    }

    // Check password if required
    if (sharedThread.password_hash) {
      if (!password) {
        return NextResponse.json({ error: "Password required", needsPassword: true }, { status: 401 })
      }

      const isValidPassword = await verifyPassword(password, sharedThread.password_hash)
      if (!isValidPassword) {
        return NextResponse.json({ error: "Invalid password", needsPassword: true }, { status: 401 })
      }
    }

    // Increment view count
    await supabaseServer
      .from("shared_threads")
      .update({ view_count: sharedThread.view_count + 1 })
      .eq("id", sharedThread.id)

    return NextResponse.json(sharedThread)
  } catch (error) {
    console.error("💥 Shared conversation API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const { token } = params
    const { password } = await req.json()

    console.log("🔍 Fetching shared conversation with password:", token)

    // Use the service role client to bypass RLS for public shares
    const { data: sharedThread, error } = await supabaseServer
      .from("shared_threads")
      .select("*")
      .eq("share_token", token)
      .single()

    if (error) {
      console.error("❌ Error fetching shared thread:", error)
      return NextResponse.json({ error: "Shared conversation not found" }, { status: 404 })
    }

    if (!sharedThread) {
      return NextResponse.json({ error: "Shared conversation not found" }, { status: 404 })
    }

    // Check if expired
    if (sharedThread.expires_at && new Date(sharedThread.expires_at) < new Date()) {
      return NextResponse.json({ error: "This shared conversation has expired" }, { status: 410 })
    }

    // Check password if required
    if (sharedThread.password_hash) {
      if (!password) {
        return NextResponse.json({ error: "Password required", needsPassword: true }, { status: 401 })
      }

      const isValidPassword = await verifyPassword(password, sharedThread.password_hash)
      if (!isValidPassword) {
        return NextResponse.json({ error: "Invalid password", needsPassword: true }, { status: 401 })
      }
    }

    // Increment view count
    await supabaseServer
      .from("shared_threads")
      .update({ view_count: sharedThread.view_count + 1 })
      .eq("id", sharedThread.id)

    return NextResponse.json(sharedThread)
  } catch (error) {
    console.error("💥 Shared conversation API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashedPassword = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
  return hashedPassword === hash
}
