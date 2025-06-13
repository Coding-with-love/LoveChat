"use client"

import { useState, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/types"
import { v4 as uuidv4 } from "uuid"

interface ConvertCodeParams {
  code: string
  sourceLanguage: string
  targetLanguage: string
  threadId: string
  messageId: string
}

export function useCodeConversion() {
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient<Database>()

  const convertCode = useCallback(
    async ({ code, sourceLanguage, targetLanguage, threadId, messageId }: ConvertCodeParams) => {
      setIsConverting(true)
      setError(null)

      try {
        // Check if we already have this conversion in the database
        const { data: existingConversions } = await supabase
          .from("code_conversions")
          .select("*")
          .eq("thread_id", threadId)
          .eq("message_id", messageId)
          .eq("original_code", code)
          .eq("target_language", targetLanguage)
          .limit(1)

        if (existingConversions && existingConversions.length > 0) {
          console.log("Found existing conversion, returning it")
          return existingConversions[0].converted_code
        }

        // If not found, call the API to convert the code
        const response = await fetch("/api/convert-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            sourceLanguage,
            targetLanguage,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to convert code")
        }

        const data = await response.json()
        const convertedCode = data.convertedCode

        // Save the conversion to the database
        const conversionId = uuidv4()
        const { error: saveError } = await supabase.from("code_conversions").insert({
          id: conversionId,
          thread_id: threadId,
          message_id: messageId,
          original_code: code,
          original_language: sourceLanguage,
          converted_code: convertedCode,
          target_language: targetLanguage,
          created_at: new Date().toISOString(),
        })

        if (saveError) {
          console.error("Error saving code conversion:", saveError)
        }

        return convertedCode
      } catch (err) {
        console.error("Error converting code:", err)
        setError(err instanceof Error ? err : new Error("Failed to convert code"))
        return null
      } finally {
        setIsConverting(false)
      }
    },
    [supabase],
  )

  return {
    convertCode,
    isConverting,
    error,
  }
}
