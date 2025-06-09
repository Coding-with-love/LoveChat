"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { useAPIKeyStore } from "@/frontend/stores/APIKeyStore"
import { toast } from "sonner"

export default function APIKeyTester() {
  const [testing, setTesting] = useState(false)
  const { getKey } = useAPIKeyStore()

  const testAPIKey = async () => {
    const googleApiKey = getKey("google")
    
    if (!googleApiKey) {
      toast.error("No Google API key found. Please add one in Settings.")
      return
    }

    setTesting(true)

    try {
      console.log("🧪 Testing API key:", {
        hasKey: !!googleApiKey,
        keyLength: googleApiKey.length,
        keyPrefix: googleApiKey.substring(0, 20),
        startsWithAIza: googleApiKey.startsWith("AIza")
      })

      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Say 'Hello World' in Python"
            }]
          }]
        })
      })

      console.log("📡 Direct API test response:", {
        status: response.status,
        statusText: response.statusText
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ API test successful:", result)
        toast.success("Google API key is valid!")
      } else {
        const errorText = await response.text()
        console.error("❌ API test failed:", errorText)
        toast.error(`API key test failed: ${response.statusText}`)
      }

    } catch (error) {
      console.error("❌ API test error:", error)
      toast.error("Failed to test API key")
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">API Key Tester</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Test if your Google API key is working correctly
      </p>
      <Button onClick={testAPIKey} disabled={testing}>
        {testing ? "Testing..." : "Test Google API Key"}
      </Button>
    </div>
  )
}
