"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"

export function StreamDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateDebugInfo = () => {
      const activeStreams = sessionStorage.getItem("activeStreams")
      const debugData = sessionStorage.getItem("activeStreamsDebug")

      setDebugInfo({
        activeStreams: activeStreams ? JSON.parse(activeStreams) : null,
        debugData: debugData ? JSON.parse(debugData) : null,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        hasBeacon: !!navigator.sendBeacon,
      })
    }

    updateDebugInfo()
    const interval = setInterval(updateDebugInfo, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 bg-red-500 hover:bg-red-600"
        size="sm"
      >
        Debug Streams
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Stream Debug Info</h3>
        <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm" className="text-white hover:bg-gray-700">
          ×
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <strong>Active Streams:</strong>
          <pre className="bg-gray-800 p-2 rounded mt-1">{JSON.stringify(debugInfo.activeStreams, null, 2)}</pre>
        </div>

        <div>
          <strong>Debug Data:</strong>
          <pre className="bg-gray-800 p-2 rounded mt-1">{JSON.stringify(debugInfo.debugData, null, 2)}</pre>
        </div>

        <div>
          <strong>Browser Info:</strong>
          <div className="bg-gray-800 p-2 rounded mt-1">
            <div>Has Beacon: {debugInfo.hasBeacon ? "✅" : "❌"}</div>
            <div>URL: {debugInfo.url}</div>
            <div>Updated: {debugInfo.timestamp}</div>
          </div>
        </div>

        <Button
          onClick={() => {
            sessionStorage.clear()
            console.log("🧹 [DEBUG] Cleared all sessionStorage")
          }}
          className="w-full bg-red-600 hover:bg-red-700"
          size="sm"
        >
          Clear SessionStorage
        </Button>
      </div>
    </div>
  )
}
