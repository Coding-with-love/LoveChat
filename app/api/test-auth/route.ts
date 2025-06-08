import { NextResponse } from "next/server"
import { getUserFromHeaders } from "@/lib/supabase/server"

export async function GET(req: Request) {
  console.log("🧪 Test auth endpoint called")

  const user = getUserFromHeaders(req)
  if (!user) {
    console.log("❌ No user found in test endpoint")
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  console.log("✅ User found in test endpoint:", user.id)
  return NextResponse.json({ user, message: "Authentication successful" })
}
