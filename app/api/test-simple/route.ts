import { NextResponse } from "next/server"

export async function GET() {
  console.log("🧪 Simple test endpoint called (no auth required)")
  return NextResponse.json({ message: "Simple test successful", timestamp: new Date().toISOString() })
}
