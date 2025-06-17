import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { streamText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { getModelConfig } from "@/lib/models"
import { v4 as uuidv4 } from "uuid"
import type { WorkflowStep } from "@/lib/types/workflow"

const WORKFLOW_GENERATION_PROMPT = `You are an expert workflow designer. Based on the user's description, create a detailed workflow with multiple steps.

Rules:
1. Each step should have a clear name, description, and specific prompt
2. Use variables like {{variable_name}} to pass data between steps
3. The first step's output becomes available as {{step1_output}}, second as {{step2_output}}, etc.
4. User inputs should be referenced as {{user_input_name}}
5. Make the workflow practical and actionable
6. Include 2-8 steps depending on complexity
7. Each step should build upon previous steps when logical

Format your response as a JSON object with this exact structure:
{
  "name": "Clear workflow name",
  "description": "Brief description of what this workflow accomplishes",
  "tags": ["tag1", "tag2", "tag3"],
  "steps": [
    {
      "name": "Step name",
      "description": "What this step does",
      "prompt": "Detailed prompt for AI to execute, using {{variable}} syntax for inputs",
      "outputVariable": "step1_output"
    }
  ]
}

Example:
User: "I want to write a blog post about a topic"
Response:
{
  "name": "Blog Post Creation Workflow",
  "description": "Research, outline, and write a comprehensive blog post on any topic",
  "tags": ["writing", "content", "blog"],
  "steps": [
    {
      "name": "Research Topic",
      "description": "Gather key information and insights about the topic",
      "prompt": "Research the topic '{{topic}}' and provide 5-7 key insights, current trends, and important facts that would be valuable for a blog post. Include any recent developments or statistics.",
      "outputVariable": "research_data"
    },
    {
      "name": "Create Outline",
      "description": "Structure the blog post with headings and key points",
      "prompt": "Based on this research: {{research_data}}\n\nCreate a detailed blog post outline for '{{topic}}' with:\n- Engaging title\n- Introduction hook\n- 4-6 main sections with subpoints\n- Conclusion\n- Target audience: {{target_audience}}",
      "outputVariable": "blog_outline"
    },
    {
      "name": "Write Blog Post",
      "description": "Write the complete blog post following the outline",
      "prompt": "Write a complete, engaging blog post following this outline: {{blog_outline}}\n\nIncorporate the research data: {{research_data}}\n\nRequirements:\n- {{word_count}} words approximately\n- Engaging and informative tone\n- Include practical examples\n- SEO-friendly with natural keyword usage\n- Clear headings and subheadings",
      "outputVariable": "final_blog_post"
    }
  ]
}

Now, based on the user's description, create a workflow:`

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

    const { description, selectedModel } = await request.json()

    if (!description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }

    console.log('🤖 Generating workflow for:', description)
    console.log('📱 Using model:', selectedModel)

    // Get model configuration
    const modelConfig = getModelConfig(selectedModel)
    console.log('⚙️ Model config:', modelConfig)

    // Get API key based on provider
    let apiKey: string | undefined

    // Try to get user's API key from database first
    const { data: userApiKey } = await supabaseServer
      .from("api_keys")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("provider", modelConfig.provider.toLowerCase())
      .single()

    if (userApiKey?.api_key) {
      apiKey = userApiKey.api_key
      console.log('🔑 Using user API key for', modelConfig.provider)
    } else {
      // Fall back to server API key
      switch (modelConfig.provider) {
        case "google":
          apiKey = process.env.GOOGLE_API_KEY
          break
        case "openai":
          apiKey = process.env.OPENAI_API_KEY
          break
        case "openrouter":
          apiKey = process.env.OPENROUTER_API_KEY
          break
      }
      console.log('🔑 Using server API key for', modelConfig.provider)
    }

    if (!apiKey) {
      return NextResponse.json({ 
        error: `No API key available for ${modelConfig.provider}. Please add your API key in settings.` 
      }, { status: 400 })
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
      case "openrouter":
        const openrouter = createOpenAI({ 
          apiKey,
          baseURL: "https://openrouter.ai/api/v1"
        })
        aiModel = openrouter(modelConfig.modelId)
        break
      default:
        return NextResponse.json({ 
          error: `Unsupported provider: ${modelConfig.provider}` 
        }, { status: 400 })
    }

    // Generate workflow using AI
    const result = await streamText({
      model: aiModel,
      messages: [
        { 
          role: "user", 
          content: `${WORKFLOW_GENERATION_PROMPT}\n\nUser description: "${description}"` 
        }
      ],
      maxTokens: 4000,
    })

    // Convert stream to text
    let fullResponse = ""
    for await (const chunk of result.textStream) {
      fullResponse += chunk
    }

    console.log('🎯 AI Response:', fullResponse)

    // Parse the JSON response
    let workflowData
    try {
      // Try to extract JSON from the response
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        workflowData = JSON.parse(jsonMatch[0])
      } else {
        workflowData = JSON.parse(fullResponse)
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError)
      console.log('Raw response:', fullResponse)
      return NextResponse.json({ 
        error: "Failed to parse AI response. Please try again with a clearer description." 
      }, { status: 500 })
    }

    // Validate the workflow structure
    if (!workflowData.name || !workflowData.steps || !Array.isArray(workflowData.steps)) {
      return NextResponse.json({ 
        error: "Invalid workflow structure generated. Please try again." 
      }, { status: 500 })
    }

    // Add IDs to steps and ensure required fields
    const processedSteps: WorkflowStep[] = workflowData.steps.map((step: any, index: number) => ({
      id: uuidv4(),
      name: step.name || `Step ${index + 1}`,
      description: step.description || "",
      prompt: step.prompt || "",
      outputVariable: step.outputVariable || `step${index + 1}_output`,
    }))

    // Create the workflow object
    const workflow = {
      name: workflowData.name,
      description: workflowData.description || "",
      steps: processedSteps,
      tags: workflowData.tags || [],
      is_public: false,
    }

    console.log('✅ Generated workflow:', {
      name: workflow.name,
      stepCount: workflow.steps.length,
      tags: workflow.tags
    })

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("❌ Workflow generation error:", error)
    return NextResponse.json({ 
      error: "Failed to generate workflow. Please try again." 
    }, { status: 500 })
  }
} 