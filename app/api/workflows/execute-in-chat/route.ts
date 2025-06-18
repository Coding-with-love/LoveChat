import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { streamText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { getModelConfig } from "@/lib/models"
import type { WorkflowStep } from "@/lib/types/workflow"
import { v4 as uuidv4 } from "uuid"
import { CustomResumableStream } from "@/lib/resumable-streams-server"

// Server-side message creation function
async function createServerMessage(threadId: string, message: any, userId: string) {
  // Ensure thread exists first
  const { data: existingThread, error: threadCheckError } = await supabaseServer
    .from("threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", userId)
    .single()

  if (threadCheckError && threadCheckError.code === "PGRST116") {
    // Thread doesn't exist, create it
    const { error: createError } = await supabaseServer.from("threads").insert({
      id: threadId,
      title: "New Chat",
      user_id: userId,
    })

    if (createError) {
      console.error("❌ Failed to create thread:", createError)
      throw createError
    }
  } else if (threadCheckError) {
    throw threadCheckError
  }

  // Ensure we have a valid UUID for the message ID
  const messageId = message.id && message.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
    ? message.id 
    : uuidv4()

  // Use upsert to handle potential race conditions
  const { error: messageError } = await supabaseServer.from("messages").upsert({
    id: messageId,
    thread_id: threadId,
    user_id: userId,
    parts: message.parts || [],
    role: message.role,
    content: message.content,
    created_at: (message.createdAt || new Date()).toISOString(),
  }, {
    onConflict: 'id',
    ignoreDuplicates: false
  })

  if (messageError) {
    console.error("❌ Failed to create message:", messageError)
    throw messageError
  }

  // Update thread timestamp
  const { error: threadError } = await supabaseServer
    .from("threads")
    .update({
      last_message_at: (message.createdAt || new Date()).toISOString(),
    })
    .eq("id", threadId)

  if (threadError) {
    console.error("❌ Failed to update thread:", threadError)
    throw threadError
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    const { workflowId, inputData, threadId, selectedModel, webSearchEnabled } = await request.json()

    // Fetch the workflow
    const { data: workflow, error: workflowError } = await supabaseServer
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Ensure thread exists
    const { data: existingThread, error: threadError } = await supabaseServer
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .single()

    if (threadError && threadError.code === "PGRST116") {
      const { error: createError } = await supabaseServer.from("threads").insert({
        id: threadId,
        title: "New Chat",
        user_id: user.id,
      })

      if (createError) {
        console.error("❌ Failed to create thread for workflow:", createError)
        return NextResponse.json({ 
          error: "Failed to create thread for workflow execution",
          details: createError.message
        }, { status: 500 })
      }
    } else if (threadError) {
      console.error("Thread access error:", threadError)
      return NextResponse.json({ 
        error: "Thread not found or access denied",
        details: threadError.message
      }, { status: 403 })
    }

    // Create execution record
    console.log('📝 Creating workflow execution record...')
    console.log('🔧 Execution data:', {
      workflow_id: workflowId,
      user_id: user.id,
      thread_id: threadId,
      status: "running",
      input_data: inputData,
      started_at: new Date().toISOString(),
      current_step: 0,
      step_count: workflow.steps.length
    })

    const { data: execution, error: executionError } = await supabaseServer
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        user_id: user.id,
        thread_id: threadId,
        status: "running",
        input_data: inputData,
        started_at: new Date().toISOString(),
        current_step: 0,
        step_results: workflow.steps.map((step: WorkflowStep) => ({
          step_id: step.id,
          status: "pending",
          input: {},
          output: null,
          error: null,
          started_at: null,
          completed_at: null,
        })),
      })
      .select()
      .single()

    if (executionError || !execution) {
      console.error("❌ Execution creation error:", executionError)
      return NextResponse.json({ 
        error: "Failed to create execution", 
        details: executionError?.message || "Unknown error" 
      }, { status: 500 })
    }

    console.log('✅ Workflow execution created successfully:', execution.id)

    // Create a streaming response that executes the workflow
    const messageId = uuidv4()
    const customStream = await CustomResumableStream.createNew(threadId, user.id, messageId)
    const stream = await customStream.create()

    // Execute workflow in background and stream results
    executeWorkflowStream(execution.id, workflow, inputData, user.id, threadId, selectedModel, webSearchEnabled, customStream)

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function executeWorkflowStream(
  executionId: string,
  workflow: any,
  inputData: Record<string, any>,
  userId: string,
  threadId: string,
  selectedModel: string,
  webSearchEnabled: boolean,
  customStream: CustomResumableStream
) {
  try {
    const context = { ...inputData }
    let fullContent = ""
    let sources: any[] = []
    let usedWebSearch = false

    // Stream initial message
    fullContent = `🚀 **Starting workflow: ${workflow.name}**\n\n`
    customStream.write(fullContent)

    const stepResults: Array<{
      step_id: string
      status: 'pending' | 'running' | 'completed' | 'failed'
      input: Record<string, any>
      output: string | null
      error: string | null
      started_at: string | null
      completed_at: string | null
    }> = workflow.steps.map((step: WorkflowStep) => ({
      step_id: step.id,
      status: "pending",
      input: {},
      output: null,
      error: null,
      started_at: null,
      completed_at: null,
    }))

    // Execute each step
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]
      const stepNumber = i + 1

      try {
        // Update step status to running
        stepResults[i].status = "running"
        stepResults[i].started_at = new Date().toISOString()

        // Stream step start indicator
        fullContent += `⚡ **Step ${stepNumber}: ${step.name}**\n`
        if (step.description) {
          fullContent += `${step.description}\n`
        }
        fullContent += "\n"
        customStream.write(fullContent)

        // Update execution in database
        await supabaseServer
          .from("workflow_executions")
          .update({
            current_step: i,
            step_results: stepResults,
          })
          .eq("id", executionId)

        // Prepare step input
        let stepInput = { ...context }
        if (step.input_mapping) {
          for (const [key, value] of Object.entries(step.input_mapping)) {
            if (typeof value === "string" && value.startsWith("{{") && value.endsWith("}}")) {
              const varName = value.slice(2, -2)
              stepInput[key] = context[varName] || ""
            } else {
              stepInput[key] = value
            }
          }
        }

        stepResults[i].input = stepInput

        let stepOutput = ""

        if (step.type === "ai_prompt") {
          // Check if this specific step has web search enabled
          const stepWebSearchEnabled = step.webSearchEnabled || false
          
          // Stream AI processing indicator
          if (stepWebSearchEnabled) {
            fullContent += "🔍 **Searching the web for current information...**\n\n"
            customStream.write(fullContent)
          }

          // Execute AI step with streaming
          const result = await executeStepWithAIStream(step.prompt, stepInput, userId, selectedModel, stepWebSearchEnabled, customStream, fullContent)
          stepOutput = result.content
          fullContent = result.fullContent
          
          if (result.sources && result.sources.length > 0) {
            sources.push(...result.sources)
            usedWebSearch = true
          }
        } else if (step.type === "web_search") {
          fullContent += "🔍 **Searching the web...**\n\n"
          customStream.write(fullContent)

          const searchQuery = stepInput.query || step.prompt
          const searchResult = await performWebSearch(searchQuery)
          stepOutput = searchResult.content
          
          if (searchResult.sources && searchResult.sources.length > 0) {
            sources.push(...searchResult.sources)
            usedWebSearch = true
          }

          fullContent += `**Search Results:**\n${stepOutput}\n\n`
          customStream.write(fullContent)
        } else {
          // Other step types
          stepOutput = `Step ${stepNumber} completed`
          fullContent += `✅ **Step ${stepNumber} completed**\n\n`
          customStream.write(fullContent)
        }

        // Update step as completed
        stepResults[i].status = "completed"
        stepResults[i].output = stepOutput
        stepResults[i].completed_at = new Date().toISOString()

        // Update context with step output
        if (step.output_key) {
          context[step.output_key] = stepOutput
        }

        // Add step result to content
        if (stepOutput && stepOutput.trim()) {
          fullContent += `**Result:**\n${stepOutput}\n\n---\n\n`
          customStream.write(fullContent)
        }

      } catch (error) {
        console.error(`Step ${stepNumber} error:`, error)
        
        stepResults[i].status = "failed"
        stepResults[i].error = error instanceof Error ? error.message : String(error)
        stepResults[i].completed_at = new Date().toISOString()

        fullContent += `❌ **Step ${stepNumber} failed:** ${error instanceof Error ? error.message : String(error)}\n\n`
        customStream.write(fullContent)
        break
      }
    }

    // Final completion message
    const completedSteps = stepResults.filter(s => s.status === "completed").length
    const totalSteps = workflow.steps.length

    if (completedSteps === totalSteps) {
      fullContent += `🎉 **Workflow completed successfully!** (${completedSteps}/${totalSteps} steps)\n\n`
      
      // Update execution status
      await supabaseServer
        .from("workflow_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          step_results: stepResults,
        })
        .eq("id", executionId)
    } else {
      fullContent += `⚠️ **Workflow partially completed** (${completedSteps}/${totalSteps} steps)\n\n`
      
      // Update execution status
      await supabaseServer
        .from("workflow_executions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          step_results: stepResults,
        })
        .eq("id", executionId)
    }

    // Create workflow execution message with sources if web search was used
    const workflowMessageId = uuidv4()
    const workflowMessageParts: any[] = [
      { type: "text", text: fullContent }
    ]

    if (usedWebSearch && sources.length > 0) {
      workflowMessageParts.push({
        type: "sources",
        sources: sources
      })
    }

    // Save the workflow execution message to database
    await supabaseServer.from("messages").insert({
      id: workflowMessageId,
      thread_id: threadId,
      user_id: userId,
      parts: workflowMessageParts,
      role: "assistant",
      content: fullContent,
      created_at: new Date().toISOString(),
      workflow_execution_id: executionId,
      workflow_name: workflow.name,
    })

    // Final stream write and close for workflow execution
    customStream.write(fullContent)
    customStream.complete()

    // Small delay to ensure proper message ordering
    await new Promise(resolve => setTimeout(resolve, 1000))

    // If workflow completed successfully, create a separate final result message
    if (completedSteps === totalSteps) {
      // Get the final output from the last step
      const lastStep = stepResults[stepResults.length - 1]
      let finalResult = ""
      
      if (lastStep && lastStep.output && lastStep.output.trim()) {
        finalResult = lastStep.output.trim()
        
        // Only create a final result message if we have meaningful content
        // and it's not just a generic completion message
        if (finalResult && 
            finalResult !== `Step ${totalSteps} completed` &&
            finalResult.length > 50 && // Must be substantial content
            !finalResult.includes("(This section would contain") && // Not a placeholder
            !finalResult.includes("Due to length constraint")) { // Not a length excuse
          
          console.log("🎯 Creating final result message with content length:", finalResult.length)
          
          // Create a new stream for the final result
          const finalMessageId = uuidv4()
          const finalCustomStream = await CustomResumableStream.createNew(threadId, userId, finalMessageId)
          const finalStream = await finalCustomStream.create()

          // Create final result message parts
          const finalMessageParts: any[] = [
            { type: "text", text: finalResult }
          ]

          // Add sources if the final step used web search and we have sources
          if (sources && sources.length > 0) {
            finalMessageParts.push({
              type: "sources",
              sources: sources
            })
          }

          // Save the final result message
          await supabaseServer.from("messages").insert({
            id: finalMessageId,
            thread_id: threadId,
            user_id: userId,
            parts: finalMessageParts,
            role: "assistant",
            content: finalResult,
            created_at: new Date().toISOString(),
          })

          // Stream the final result
          finalCustomStream.write(finalResult)
          finalCustomStream.complete()
          
          console.log("✅ Final result message created successfully")
        } else {
          console.log("⚠️ Final result not substantial enough or contains placeholders, skipping separate message")
        }
      } else {
        console.log("⚠️ No meaningful final output found in last step")
      }
    }

    // Update thread timestamp
    await supabaseServer
      .from("threads")
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq("id", threadId)

  } catch (error) {
    console.error("Workflow execution error:", error)
    
    // Update execution as failed
    await supabaseServer
      .from("workflow_executions")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      })
      .eq("id", executionId)

    const errorContent = `❌ **Workflow execution failed:** ${error instanceof Error ? error.message : String(error)}`
    customStream.write(errorContent)
    customStream.complete()
  }
}

async function executeStepWithAIStream(
  prompt: string, 
  stepInput: Record<string, any>, 
  userId: string, 
  selectedModel: string, 
  webSearchEnabled: boolean,
  customStream: CustomResumableStream,
  currentContent: string
): Promise<{ content: string, fullContent: string, sources?: any[] }> {
  try {
         const modelConfig = getModelConfig(selectedModel as any)
     let aiModel: any

    // Initialize AI provider
    if (modelConfig.provider === "google") {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
      })
      aiModel = google(modelConfig.modelId)
    } else if (modelConfig.provider === "openai") {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      aiModel = openai(modelConfig.modelId)
    } else if (modelConfig.provider === "openrouter") {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      })
      aiModel = openrouter(modelConfig.modelId)
    } else {
      throw new Error(`Unsupported provider: ${modelConfig.provider}`)
    }

    // Prepare the prompt with step input
    let finalPrompt = prompt
    for (const [key, value] of Object.entries(stepInput)) {
      finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    }

    // Add instructions for complete content generation
    const enhancedPrompt = `${finalPrompt}

IMPORTANT: Generate complete, detailed content as requested. Do NOT use placeholders like "(This section would contain...)" or "(Due to length constraints...)". If the request asks for a specific word count or length, provide the full content with that length. Be thorough and comprehensive in your response.`

    const messages = [
      {
        role: "user" as const,
        content: enhancedPrompt,
      },
    ]

         // Stream the AI response
     const result = await streamText({
       model: aiModel,
       messages,
       ...(webSearchEnabled && modelConfig.provider === "google" && {
         experimental_providerOptions: {
           google: { search: { enabled: true } }
         }
       }),
     })

    let aiContent = ""
    let fullContent = currentContent
    let sources: any[] = []

    // Process the stream
    for await (const chunk of result.textStream) {
      aiContent += chunk
      fullContent = currentContent + aiContent
      customStream.write(fullContent)
    }

    // Extract sources if available
    const finalResult = await result.response
    if (finalResult.headers?.['x-search-results']) {
      try {
        const searchResults = JSON.parse(finalResult.headers['x-search-results'])
        sources = searchResults.map((result: any) => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        }))
      } catch (e) {
        console.error("Failed to parse search results:", e)
      }
    }

    return { 
      content: aiContent, 
      fullContent: fullContent,
      sources: sources.length > 0 ? sources : undefined
    }
  } catch (error) {
    console.error("AI step execution error:", error)
    throw error
  }
}

async function performWebSearch(query: string): Promise<{ content: string, sources?: any[] }> {
  try {
    // Check for Serper API key
    const serperApiKey = process.env.SERPER_API_KEY
    if (!serperApiKey) {
      console.error("❌ SERPER_API_KEY not found in environment variables")
      return {
        content: `Web search failed: Serper API key not configured`
      }
    }

    // Use Serper API for Google search results
    const searchUrl = "https://google.serper.dev/search"

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": serperApiKey,
      },
      body: JSON.stringify({
        q: query,
        num: 5,
      }),
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data = await response.json()
    const results = []
    const sources = []

    // Add answer box if available
    if (data.answerBox) {
      const answer = data.answerBox
      results.push(`**${answer.title || "Answer"}**\n${answer.answer || answer.snippet || ""}`)
      sources.push({
        title: answer.title || "Answer",
        url: answer.link || "#",
        snippet: answer.answer || answer.snippet || "",
        source: answer.source || "Google Answer Box",
      })
    }

    // Add knowledge graph if available
    if (data.knowledgeGraph) {
      const kg = data.knowledgeGraph
      results.push(`**${kg.title || "Knowledge Graph"}**\n${kg.description || kg.descriptionSource || ""}`)
      sources.push({
        title: kg.title || "Knowledge Graph",
        url: kg.descriptionLink || kg.website || "#",
        snippet: kg.description || kg.descriptionSource || "",
        source: "Google Knowledge Graph",
      })
    }

    // Add organic search results
    if (data.organic && data.organic.length > 0) {
      data.organic.slice(0, 3).forEach((result: any) => {
        results.push(`**${result.title}**\n${result.snippet || result.description || ""}`)
        sources.push({
          title: result.title || "Search Result",
          url: result.link || "#",
          snippet: result.snippet || result.description || "",
          source: result.domain || "Google",
        })
      })
    }

    const content = results.length > 0 
      ? results.join("\n\n")
      : `Search completed for "${query}" but no specific results found.`

    return { 
      content,
      sources: sources.length > 0 ? sources : undefined
    }
  } catch (error) {
    console.error("Web search error:", error)
    return { 
      content: `Web search failed: ${error instanceof Error ? error.message : String(error)}` 
    }
  }
} 