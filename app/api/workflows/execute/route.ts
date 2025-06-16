import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { streamText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { getModelConfig } from "@/lib/models"
import type { WorkflowStep } from "@/lib/types/workflow"

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

    const { workflowId, inputData, threadId } = await request.json()

    // Fetch the workflow
    const { data: workflow, error: workflowError } = await supabaseServer
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Create execution record
    const { data: execution, error: executionError } = await supabaseServer
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        user_id: user.id,
        thread_id: threadId,
        status: "running",
        input_data: inputData,
        started_at: new Date().toISOString(),
        step_results: workflow.steps.map((step: WorkflowStep) => ({
          step_id: step.id,
          status: "pending",
        })),
      })
      .select()
      .single()

    if (executionError || !execution) {
      return NextResponse.json({ error: "Failed to create execution" }, { status: 500 })
    }

    // Execute workflow steps in background
    executeWorkflowSteps(execution.id, workflow.steps, inputData, user.id)

    return NextResponse.json(execution)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function executeWorkflowSteps(
  executionId: string,
  steps: WorkflowStep[],
  inputData: Record<string, any>,
  userId: string,
) {
  try {
    const context = { ...inputData }
    const stepResults = []

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      // Update current step
      await supabaseServer.from("workflow_executions").update({ current_step: i }).eq("id", executionId)

      // Update step status to running
      const updatedResults = stepResults.concat(
        steps.slice(stepResults.length).map((s, idx) => ({
          step_id: s.id,
          status: idx === 0 ? "running" : "pending",
        })),
      )

      await supabaseServer.from("workflow_executions").update({ step_results: updatedResults }).eq("id", executionId)

      try {
        // Replace variables in prompt
        let prompt = step.prompt
        for (const [key, value] of Object.entries(context)) {
          prompt = prompt.replace(new RegExp(`{{${key}}}`, "g"), String(value))
        }

        // Execute step using AI
        const result = await executeStepWithAI(prompt, userId)

        // Store result in context
        const outputVariable = step.outputVariable || step.id
        context[outputVariable] = result

        // Update step result
        stepResults.push({
          step_id: step.id,
          status: "completed",
          input: { prompt },
          output: result,
          completed_at: new Date().toISOString(),
        })
      } catch (stepError) {
        console.error(`Step ${step.id} failed:`, stepError)

        stepResults.push({
          step_id: step.id,
          status: "failed",
          error: stepError instanceof Error ? stepError.message : "Unknown error",
        })

        // Mark execution as failed
        await supabaseServer
          .from("workflow_executions")
          .update({
            status: "failed",
            error_message: `Step "${step.name}" failed: ${stepError instanceof Error ? stepError.message : "Unknown error"}`,
            step_results: stepResults,
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionId)

        return
      }
    }

    // Mark execution as completed
    await supabaseServer
      .from("workflow_executions")
      .update({
        status: "completed",
        output_data: context,
        step_results: stepResults,
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId)
  } catch (error) {
    console.error("Workflow execution failed:", error)

    await supabaseServer
      .from("workflow_executions")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId)
  }
}

async function executeStepWithAI(prompt: string, userId: string): Promise<string> {
  // Get user's preferred model or use default
  const selectedModel = "gemini-2.0-flash-exp" // Default model
  const modelConfig = getModelConfig(selectedModel as any)

  // Get API key from environment or user settings
  let apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    // Try to get user's API key from database
    const { data: userApiKey } = await supabaseServer
      .from("api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("provider", modelConfig.provider.toLowerCase())
      .single()

    if (userApiKey?.api_key) {
      apiKey = userApiKey.api_key
    }
  }

  if (!apiKey) {
    throw new Error(`No API key available for ${modelConfig.provider}`)
  }

  // Create AI model
  let aiModel
  switch (modelConfig.provider) {
    case "google":
      const google = createGoogleGenerativeAI({ apiKey })
      aiModel = google(modelConfig.modelId)
      break
    case "openai":
      const openai = createOpenAI({ apiKey })
      aiModel = openai(modelConfig.modelId)
      break
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`)
  }

  // Generate response
  const result = await streamText({
    model: aiModel,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 4000,
  })

  // Convert stream to text
  let fullText = ""
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  return fullText.trim()
}
