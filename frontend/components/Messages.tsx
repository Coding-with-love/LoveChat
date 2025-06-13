"use client"

import { memo, useState, useRef } from "react"
import Message from "./Message"
import type { UIMessage } from "ai"
import type { UseChatHelpers } from "@ai-sdk/react"
import MessageLoading from "./ui/MessageLoading"
import Error from "./Error"
import ChatLandingPage from "./ChatLandingPage"
import { useAuth } from "@/frontend/components/AuthProvider"
import { getModelConfig } from "@/lib/models"
import { useTextSelection } from "@/frontend/hooks/useTextSelection"
import { useAIActions } from "@/frontend/hooks/useAIActions"
import AIContextMenu from "./AIContextMenu"
import AIActionResultDialog from "./AIActionResultDialog"
import InlineReplacement from "./InlineReplacement"
import RephrasedTextIndicator from "./RephrasedTextIndicator"
import { supabase } from "@/lib/supabase/client"
import { updateMessageInDatabase } from "@/lib/supabase/queries"
import { toast } from "sonner"

// Extend UIMessage to include reasoning field
interface ExtendedUIMessage extends UIMessage {
  reasoning?: string
  model?: string
}

function PureMessages({
  threadId,
  messages,
  status,
  setMessages,
  reload,
  error,
  stop,
  registerRef,
  resumeComplete,
  resumedMessageId,
  onPromptClick,
}: {
  threadId: string
  messages: ExtendedUIMessage[]
  setMessages: UseChatHelpers["setMessages"]
  reload: UseChatHelpers["reload"]
  status: UseChatHelpers["status"]
  error: UseChatHelpers["error"]
  stop: UseChatHelpers["stop"]
  registerRef: (id: string, ref: HTMLDivElement | null) => void
  resumeComplete?: boolean
  resumedMessageId?: string | null
  onPromptClick?: (prompt: string) => void
}) {
  // State to manage thinking visibility for each message
  const [showThinking, setShowThinking] = useState<Record<string, boolean>>(() =>
    messages.reduce((acc: Record<string, boolean>, message) => {
      acc[message.id] = false
      return acc
    }, {}),
  )
  const { profile } = useAuth()

  // Text selection and AI actions
  const { selection, clearSelection } = useTextSelection()
  const { isProcessing, result, showResult, processAction, closeResult } = useAIActions()

  // Inline replacement state
  const [showReplacement, setShowReplacement] = useState(false)
  const [replacementText, setReplacementText] = useState("")
  const [originalText, setOriginalText] = useState("")
  const [currentText, setCurrentText] = useState("") // Track the current text for multiple rephrases
  const [isReplacing, setIsReplacing] = useState(false)
  const [replacementPosition, setReplacementPosition] = useState({ x: 0, y: 0 })
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null)
  const lastSelectionRef = useRef<Range | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Track original text for each message to detect rephrased content
  const [originalTexts, setOriginalTexts] = useState<Record<string, string>>({})

  // Helper function to detect if a message contains rephrased content
  const isMessageRephrased = (message: ExtendedUIMessage): boolean => {
    return message.content.includes('*[Rephrased]:') || !!originalTexts[message.id]
  }

  // Helper function to extract original text from rephrased content
  const getOriginalText = (message: ExtendedUIMessage): string => {
    // First check our tracked original texts
    if (originalTexts[message.id]) {
      return originalTexts[message.id]
    }
    
    // Try to extract from content if it contains rephrased markers
    if (message.content.includes('*[Rephrased]:')) {
      // Extract text before the first rephrased marker
      const beforeRephrased = message.content.split('*[Rephrased]:')[0].trim()
      if (beforeRephrased) {
        return beforeRephrased
      }
    }
    
    // Fallback to parts if available
    const textPart = message.parts?.find(part => part.type === 'text')
    return textPart?.text || message.content
  }

  // Helper function to get current rephrased text
  const getRephrasedText = (message: ExtendedUIMessage): string => {
    if (message.content.includes('*[Rephrased]:')) {
      // Extract the latest rephrased text
      const rephrasedMatches = message.content.match(/\*\[Rephrased\]: (.*?)\*/g)
      if (rephrasedMatches && rephrasedMatches.length > 0) {
        const lastMatch = rephrasedMatches[rephrasedMatches.length - 1]
        const extracted = lastMatch.replace(/\*\[Rephrased\]: (.*?)\*/, '$1')
        return extracted
      }
    }
    return message.content
  }

  // Handle reverting to original text
  const handleRevertToOriginalText = async (messageId: string, originalText: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return
    
    console.log("🔄 Reverting message to original text:", {
      messageId,
      originalText: originalText.substring(0, 100),
      currentContent: message.content.substring(0, 100)
    })

    const success = await updateMessageContent(messageId, originalText)
    if (success) {
      // Remove from tracked original texts since it's no longer rephrased
      setOriginalTexts(prev => {
        const updated = { ...prev }
        delete updated[messageId]
        return updated
      })
      toast.success("Reverted to original text")
    }
  }

  const handleAIAction = async (
    action: "explain" | "translate" | "rephrase" | "summarize",
    text: string,
    targetLanguage?: string,
  ): Promise<string | null> => {
    console.log("🎯 AI Action triggered:", action, "for text:", text.substring(0, 50) + "...")

    // Save the current selection range for later use
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      lastSelectionRef.current = selection.getRangeAt(0).cloneRange()

      // Enhanced debugging for message detection
      console.log("🔍 Selection debug info:", {
        selectionText: selection.toString().substring(0, 100),
        rangeCount: selection.rangeCount,
        anchorNode: selection.anchorNode?.nodeType,
        anchorNodeText: selection.anchorNode?.textContent?.substring(0, 50),
      })

      // Find which message contains this selection
      let messageElement = selection.anchorNode?.parentElement
      let attempts = 0
      const maxAttempts = 10
      
      console.log("🔍 Starting DOM traversal to find message ID...")
      while (messageElement && !messageElement.dataset.messageId && attempts < maxAttempts) {
        attempts++
        console.log(`🔍 Attempt ${attempts}: Checking element:`, {
          tagName: messageElement.tagName,
          className: messageElement.className,
          hasMessageId: !!messageElement.dataset.messageId,
          messageId: messageElement.dataset.messageId,
          hasMessageContent: !!messageElement.dataset.messageContent,
        })
        messageElement = messageElement.parentElement
      }

      if (messageElement?.dataset.messageId) {
        setTargetMessageId(messageElement.dataset.messageId)
        console.log("✅ Target message ID found:", messageElement.dataset.messageId)
        
        // Additional verification - find the actual message in our state
        const foundMessage = messages.find(m => m.id === messageElement.dataset.messageId)
        if (foundMessage) {
          console.log("✅ Message verified in state:", {
            messageId: foundMessage.id,
            role: foundMessage.role,
            contentLength: foundMessage.content.length,
            contentPreview: foundMessage.content.substring(0, 100),
          })
        } else {
          console.error("❌ Message ID found in DOM but not in state!")
        }
      } else {
        console.error("❌ Could not find target message ID after", attempts, "attempts")
        console.error("❌ Final element:", messageElement?.tagName, messageElement?.className)
      }
    } else {
      console.error("❌ No selection found")
    }

    // For rephrase, show inline replacement
    if (action === "rephrase") {
      console.log("🔄 Starting rephrase with inline replacement")
      setIsReplacing(true)
      setOriginalText(text)
      setCurrentText(text) // Set current text to the text being rephrased

      // Calculate position for the replacement dialog
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setReplacementPosition({
          x: rect.left,
          y: rect.bottom + 10,
        })
      }

      try {
        const result = await processAction(action, text, targetLanguage, false)
        console.log("✅ Rephrase result:", result)

        if (result) {
          setReplacementText(result)
          setShowReplacement(true)
          return result
        }
        return null
      } catch (error) {
        console.error("❌ Failed to rephrase:", error)
        return null
      } finally {
        setIsReplacing(false)
      }
    } else {
      console.log("📋 Using dialog for action:", action)
      // For other actions, use the normal dialog
      const result = await processAction(action, text, targetLanguage, true)
      return result
    }
  }

  const updateMessageContent = async (messageId: string, newContent: string) => {
    console.log("💾 Updating entire message content in database...")
    console.log("🔍 Debug info:", {
      messageId,
      newContentLength: newContent.length,
      newContentPreview: newContent.substring(0, 200),
    })

    setIsSaving(true)

    try {
      // Find the message in our current state
      const messageIndex = messages.findIndex((m) => m.id === messageId)
      if (messageIndex === -1) {
        console.error("❌ Message not found in state:", messageId)
        toast.error("Message not found in current state")
        return false
      }

      const message = messages[messageIndex]
      console.log("📄 Current message content:", {
        messageId: message.id,
        contentLength: message.content.length,
        contentPreview: message.content.substring(0, 200),
        role: message.role,
      })

      // Use the dedicated function to update the message
      console.log("💾 Calling updateMessageInDatabase with new content...")

      const success = await updateMessageInDatabase(messageId, newContent)

      if (!success) {
        console.error("❌ Failed to update message in database")
        toast.error("Failed to save changes to database")
        return false
      }

      // Update in local state FIRST to ensure immediate UI update
      const updatedMessages = [...messages]
      updatedMessages[messageIndex] = {
        ...message,
        content: newContent,
      }
      setMessages(updatedMessages)

      console.log("✅ Message updated successfully in database and local state")
      toast.success("Text replaced and saved successfully")

      // Verify the update worked by fetching the message again
      const { data: updatedMessage, error: verifyError } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .single()

      if (verifyError) {
        console.error("❌ Failed to verify update:", verifyError)
        toast.warning("Could not verify update")
      } else {
        console.log("✅ Verification - Updated message in DB:", {
          id: updatedMessage.id,
          contentLength: updatedMessage.content.length,
          contentPreview: updatedMessage.content.substring(0, 200),
        })

        // Check if content was actually updated
        if (updatedMessage.content !== newContent) {
          console.error("❌ Content mismatch after update:", {
            expectedLength: newContent.length,
            actualLength: updatedMessage.content.length,
            expectedPreview: newContent.substring(0, 200),
            actualPreview: updatedMessage.content.substring(0, 200),
          })
          toast.warning("Message may not have been updated correctly")
          return false
        } else {
          console.log("✅ Content verification passed - database content matches expected content")
        }
      }

      // Final verification - fetching message directly from DB...
      const { data: finalCheck, error: finalError } = await supabase
        .from("messages")
        .select("content")
        .eq("id", messageId)
        .single()

      if (finalError) {
        console.error("❌ Final check failed:", finalError)
      } else {
        console.log("✅ Final DB state:", {
          contentLength: finalCheck.content.length,
          contentPreview: finalCheck.content.substring(0, 200),
          matches: finalCheck.content === newContent,
        })
      }

      return true
    } catch (error) {
      console.error("❌ Unexpected error updating message:", error)
      toast.error("An unexpected error occurred")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const replaceSelectedText = async (newText: string) => {
    console.log("🔄 Starting replaceSelectedText with:", {
      newText: newText.substring(0, 100),
      originalText: originalText.substring(0, 100),
      currentText: currentText.substring(0, 100),
      targetMessageId,
    })

    if (!targetMessageId) {
      console.error("❌ No target message ID")
      toast.error("Could not identify target message")
      return
    }

    // Find the message in our current state
    const messageIndex = messages.findIndex((m) => m.id === targetMessageId)
    if (messageIndex === -1) {
      console.error("❌ Message not found in state:", targetMessageId)
      console.error("📋 Available message IDs:", messages.map(m => m.id))
      toast.error("Message not found")
      return
    }

    const message = messages[messageIndex]
    console.log("📄 Found target message:", {
      messageId: message.id,
      contentLength: message.content.length,
      contentPreview: message.content.substring(0, 200),
      role: message.role,
    })

    // CRITICAL FIX: Use currentText instead of originalText for replacement
    // currentText tracks the most recent version of the text being replaced
    const textToReplace = currentText || originalText
    console.log("🎯 Text to replace:", `"${textToReplace}"`)
    console.log("🎯 New text:", `"${newText}"`)
    
    // DEBUG: Show detailed comparison
    console.log("🔍 DETAILED DEBUG INFO:")
    console.log("📝 Message content (first 500 chars):", `"${message.content.substring(0, 500)}"`)
    console.log("📝 Message content length:", message.content.length)
    console.log("🎯 Text to replace (first 200 chars):", `"${textToReplace.substring(0, 200)}"`)
    console.log("🎯 Text to replace length:", textToReplace.length)
    console.log("🔍 Direct includes check:", message.content.includes(textToReplace))
    
    // Show character-by-character comparison for first few characters
    console.log("🔍 Character comparison (first 20 chars):")
    for (let i = 0; i < Math.min(20, textToReplace.length); i++) {
      const char = textToReplace[i]
      const charCode = char.charCodeAt(0)
      const inContent = message.content.includes(char)
      console.log(`  [${i}] '${char}' (${charCode}) - in content: ${inContent}`)
    }

    let updatedContent = message.content

    // Strategy 1: Direct replacement with currentText
    if (updatedContent.includes(textToReplace)) {
      console.log("✅ Strategy 1: Direct replacement with currentText")
      // Use global replacement to handle multiple occurrences
      updatedContent = updatedContent.replace(new RegExp(textToReplace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), newText)
      console.log("✅ Strategy 1 result:", updatedContent.substring(0, 200))
    }
    // Strategy 2: Try with originalText if currentText didn't work
    else if (updatedContent.includes(originalText)) {
      console.log("✅ Strategy 2: Direct replacement with originalText")
      updatedContent = updatedContent.replace(new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), newText)
      console.log("✅ Strategy 2 result:", updatedContent.substring(0, 200))
    }
    // Strategy 3: Normalize whitespace and try again
    else {
      const normalizedTextToReplace = textToReplace.replace(/\s+/g, " ").trim()
      const normalizedContent = updatedContent.replace(/\s+/g, " ")

      console.log("🔍 Strategy 3 - Normalized text to replace:", `"${normalizedTextToReplace}"`)
      console.log("🔍 Strategy 3 - Normalized content:", `"${normalizedContent.substring(0, 200)}"`)
      console.log("🔍 Strategy 3 - Does normalized content include normalized text?", normalizedContent.includes(normalizedTextToReplace))

      if (normalizedContent.includes(normalizedTextToReplace)) {
        console.log("✅ Strategy 3: Normalized replacement")
        // Use regex to handle different whitespace patterns
        const escapedText = textToReplace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
        const regex = new RegExp(escapedText, "g")
        updatedContent = updatedContent.replace(regex, newText)
        console.log("✅ Strategy 3 result:", updatedContent.substring(0, 200))
      }
      // Strategy 4: Word-by-word replacement for partial matches
      else {
        console.log("🔄 Strategy 4: Word-by-word replacement")
        const words = textToReplace.split(/\s+/).filter((w) => w.length > 3)
        let foundWords = 0

        console.log("🔍 Strategy 4 - Words to find:", words)

        for (const word of words) {
          if (updatedContent.includes(word)) {
            foundWords++
            console.log("✅ Found word:", word)
          } else {
            console.log("❌ Missing word:", word)
          }
        }

        console.log("🔍 Strategy 4 - Found words:", foundWords, "out of", words.length)

        if (foundWords >= Math.max(1, words.length * 0.7)) {
          console.log("✅ Strategy 4: Partial word replacement")
          // Find the longest matching word sequence
          for (let i = words.length; i >= 1; i--) {
            for (let j = 0; j <= words.length - i; j++) {
              const wordSequence = words.slice(j, j + i).join(" ")
              if (updatedContent.includes(wordSequence)) {
                console.log("✅ Strategy 4 - Replacing word sequence:", wordSequence)
                updatedContent = updatedContent.replace(wordSequence, newText)
                console.log("✅ Strategy 4 result:", updatedContent.substring(0, 200))
                break
              }
            }
            if (updatedContent !== message.content) break // Exit if we found something to replace
          }
        }
        
        // Strategy 5: Fuzzy matching - handle cases where content has different formatting
        if (updatedContent === message.content) {
          console.log("🔄 Strategy 5: Fuzzy matching approach")
          
          // Try removing common markdown/formatting differences
          const cleanedMessage = message.content
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
            .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
            .replace(/`(.*?)`/g, '$1')       // Remove code markdown
            .replace(/\s+/g, ' ')            // Normalize all whitespace to single spaces
            .trim()
            
          const cleanedTextToReplace = textToReplace
            .replace(/\s+/g, ' ')            // Normalize all whitespace to single spaces
            .trim()
            
          console.log("🔍 Strategy 5 - Cleaned message (first 200 chars):", `"${cleanedMessage.substring(0, 200)}"`)
          console.log("🔍 Strategy 5 - Cleaned text to replace:", `"${cleanedTextToReplace}"`)
          console.log("🔍 Strategy 5 - Cleaned includes check:", cleanedMessage.includes(cleanedTextToReplace))
          
          if (cleanedMessage.includes(cleanedTextToReplace)) {
            console.log("✅ Strategy 5: Found match with cleaned text")
            // Use regex to find and replace with more flexible whitespace matching
            const flexibleRegex = new RegExp(
              cleanedTextToReplace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
              "gi"
            )
            
            if (flexibleRegex.test(message.content)) {
              updatedContent = message.content.replace(flexibleRegex, newText)
              console.log("✅ Strategy 5 result:", updatedContent.substring(0, 200))
            } else {
              console.log("❌ Strategy 5: Regex test failed")
            }
          }
        }
        
        // Strategy 6: Last resort - targeted word replacement
        if (updatedContent === message.content) {
          console.log("🔄 Strategy 6: Last resort word replacement")
          
          // Find the most unique words (3+ chars, not common words)
          const words = textToReplace.split(/\s+/).filter(word => 
            word.length >= 3 && 
            !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word.toLowerCase())
          )
          
          console.log("🔍 Strategy 6 - Unique words:", words)
          
          // Try to find a unique sequence of 2-3 words that exists in the content
          for (let seqLen = Math.min(3, words.length); seqLen >= 2; seqLen--) {
            for (let i = 0; i <= words.length - seqLen; i++) {
              const sequence = words.slice(i, i + seqLen).join(' ')
              if (message.content.includes(sequence)) {
                console.log("✅ Strategy 6: Found unique sequence:", sequence)
                // Replace the sequence with a corresponding part of the new text
                const newWords = newText.split(/\s+/)
                const replacementSequence = newWords.slice(i, i + seqLen).join(' ') || newText
                updatedContent = message.content.replace(sequence, replacementSequence)
                console.log("✅ Strategy 6 result:", updatedContent.substring(0, 200))
                break
              }
            }
            if (updatedContent !== message.content) break
          }
        }
        
        // Strategy 7: Handle already-rephrased content
        if (updatedContent === message.content) {
          console.log("🔄 Strategy 7: Handling already-rephrased content")
          
          // Check if the message content contains rephrased entries
          const rephrasedPattern = /\*\[Rephrased\]: (.*?)\n?\*/g
          const rephrasedMatches = [...message.content.matchAll(rephrasedPattern)]
          
          console.log("🔍 Strategy 7 - Found rephrased entries:", rephrasedMatches.length)
          
          if (rephrasedMatches.length > 0) {
            console.log("✅ Strategy 7: Cleaning up multiple rephrased entries and adding new one")
            
            // Remove all existing rephrased entries
            let cleanedContent = message.content.replace(/\n*\*\[Rephrased\]: .*?\n?\*\n*/g, '')
            cleanedContent = cleanedContent.trim()
            
            // Add the new rephrased text cleanly
            updatedContent = `${cleanedContent}\n\n*[Rephrased]: ${newText}*`
            
            console.log("✅ Strategy 7 result:", updatedContent.substring(0, 200))
          } else {
            // No rephrased entries found, try one more approach - replace the entire content
            console.log("🔄 Strategy 7b: Replacing entire message content")
            updatedContent = newText
            console.log("✅ Strategy 7b result:", updatedContent.substring(0, 200))
          }
        }
        
        // Final fallback - show detailed error
        if (updatedContent === message.content) {
          console.error("❌ All replacement strategies failed")
          console.error("🔍 Final debug - message content snippet:")
          console.error(message.content.substring(0, 300))
          console.error("🔍 Final debug - text to replace:")
          console.error(textToReplace)
          
          toast.error("Could not locate the selected text in the message. This might be due to formatting differences between display and storage.")
          return
        }
      }
    }

    console.log("🔍 Final content comparison:")
    console.log("📄 Original content length:", message.content.length)
    console.log("📄 Updated content length:", updatedContent.length)
    console.log("📄 Content changed?", message.content !== updatedContent)
    console.log("📄 Content changed by chars:", updatedContent.length - message.content.length)

    // Verify the replacement actually happened
    if (updatedContent === message.content) {
      console.error("❌ No changes were made to the content")
      toast.error("Failed to replace text - no changes detected")
      return
    }

    // Update the DOM immediately for visual feedback
    if (lastSelectionRef.current) {
      try {
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(lastSelectionRef.current)

          const range = selection.getRangeAt(0)
          range.deleteContents()
          range.insertNode(document.createTextNode(newText))
          selection.removeAllRanges()
          console.log("✅ Text replaced in DOM")
        }
      } catch (error) {
        console.warn("⚠️ Could not update DOM, but will proceed with database update:", error)
      }
    }

    // Update the message content in database and state
    console.log("🔄 Proceeding with database update...")
    console.log("🔍 About to call updateMessageContent with:", {
      targetMessageId,
      updatedContentLength: updatedContent.length,
      updatedContentPreview: updatedContent.substring(0, 200),
      originalContentPreview: message.content.substring(0, 200),
    })
    
    const success = await updateMessageContent(targetMessageId, updatedContent)
    if (!success) {
      console.error("❌ Failed to persist changes - consider reloading")
      toast.warning("Changes may not persist after reload")
    } else {
      console.log("✅ updateMessageContent returned success")
      // Update currentText to the new text for future replacements
      setCurrentText(newText)
      
      // Track original text for this message if it's not already tracked
      if (!originalTexts[targetMessageId]) {
        const originalText = getOriginalText(message)
        setOriginalTexts(prev => ({
          ...prev,
          [targetMessageId]: originalText
        }))
        console.log("📝 Tracking original text for message:", targetMessageId)
      }
      
      // Additional verification: check if the content was actually updated in the local state
      const updatedMessage = messages.find(m => m.id === targetMessageId)
      if (updatedMessage) {
        console.log("🔍 Post-update verification:", {
          messageId: updatedMessage.id,
          contentLength: updatedMessage.content.length,
          contentPreview: updatedMessage.content.substring(0, 100),
          containsNewText: updatedMessage.content.includes(newText),
          containsOldText: updatedMessage.content.includes(textToReplace),
        })
      }
    }
  }

  const toggleThinking = (messageId: string) => {
    setShowThinking((prev) => {
      const newState = { ...prev }
      newState[messageId] = !newState[messageId]
      return newState
    })
  }

  // Check if the current model supports thinking
  const isThinkingModel = (modelName: string) => {
    try {
      const config = getModelConfig(modelName as any)
      return config.supportsThinking || false
    } catch {
      return modelName?.includes("o1") || modelName?.includes("thinking") || false
    }
  }

  // Show landing page when there are no messages and not loading
  if (messages.length === 0 && status !== "submitted" && !error) {
    return (
      <ChatLandingPage
        onPromptClick={onPromptClick || (() => {})}
        userName={profile?.full_name || profile?.username || ""}
      />
    )
  }

  return (
    <>
      <section className="flex flex-col space-y-12">
        {messages.map((message, index) => (
          <div key={message.id} data-message-id={message.id}>
            <Message
              threadId={threadId}
              message={message}
              isStreaming={status === "streaming" && messages.length - 1 === index}
              setMessages={setMessages}
              reload={reload}
              registerRef={registerRef}
              stop={stop}
              resumeComplete={resumeComplete}
              resumedMessageId={resumedMessageId}
              showThinking={showThinking[message.id] || false}
              toggleThinking={() => toggleThinking(message.id)}
              isThinkingModel={isThinkingModel(message.model || "")}
              // Pass rephrased text info
              onRevertToOriginal={(originalText: string) => handleRevertToOriginalText(message.id, originalText)}
            />
          </div>
        ))}
        {status === "submitted" && <MessageLoading />}
        {error && <Error message={error.message} />}
      </section>

      {/* AI Context Menu for text selection */}
      {selection && selection.position && !showReplacement && (
        <AIContextMenu
          selectedText={selection.text}
          position={selection.position}
          onClose={clearSelection}
          onAction={handleAIAction}
          isProcessing={isProcessing || isReplacing}
        />
      )}

      {/* Inline Replacement */}
      {showReplacement && (
        <div
          style={{
            position: "fixed",
            left: replacementPosition.x,
            top: replacementPosition.y,
            zIndex: 50,
          }}
        >
          <InlineReplacement
            newText={replacementText}
            onAccept={async () => {
              console.log("🎯 ACCEPT CLICKED - Starting replacement process...")
              console.log("🔍 Accept Debug Info:", {
                replacementText: replacementText.substring(0, 100),
                originalText: originalText.substring(0, 100),
                targetMessageId,
                messagesCount: messages.length,
              })
              
              try {
                await replaceSelectedText(replacementText)
                console.log("✅ replaceSelectedText completed successfully")
              } catch (error) {
                console.error("❌ replaceSelectedText failed:", error)
              }
              
              setCurrentText(replacementText) // Update current text to the accepted replacement
              setShowReplacement(false)
              clearSelection()
              setTargetMessageId(null)
              setOriginalText("")
              console.log("🎯 ACCEPT COMPLETED - All cleanup done")
            }}
            onReject={() => {
              setShowReplacement(false)
              clearSelection()
              setTargetMessageId(null)
              setOriginalText("")
              setCurrentText("")
            }}
            onRetry={async () => {
              setIsReplacing(true)
              try {
                const result = await processAction("rephrase", currentText, undefined, false)
                if (result) {
                  setReplacementText(result)
                }
              } catch (error) {
                console.error("Failed to retry rephrase:", error)
              } finally {
                setIsReplacing(false)
              }
            }}
            isProcessing={isReplacing || isSaving}
          />
        </div>
      )}

      {/* AI Action Result Dialog */}
      <AIActionResultDialog isOpen={showResult} onClose={closeResult} result={result} />
    </>
  )
}

const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false
  if (prevProps.error !== nextProps.error) return false
  if (prevProps.messages.length !== nextProps.messages.length) return false
  if (prevProps.resumeComplete !== nextProps.resumeComplete) return false
  if (prevProps.resumedMessageId !== nextProps.resumedMessageId) return false

  // Custom comparison to account for reasoning
  if (prevProps.messages.length === nextProps.messages.length) {
    for (let i = 0; i < prevProps.messages.length; i++) {
      const prevMessage = prevProps.messages[i]
      const nextMessage = nextProps.messages[i]

      if (
        prevMessage.id !== nextMessage.id ||
        prevMessage.content !== nextMessage.content ||
        prevMessage.role !== nextMessage.role ||
        prevMessage.reasoning !== nextMessage.reasoning
      ) {
        return false
      }
    }
  }

  return true
})

Messages.displayName = "Messages"

export default Messages
