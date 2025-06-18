import type { Persona } from "@/lib/supabase/types"
import type { UserPreferences } from "@/frontend/stores/UserPreferencesStore"

export function getSystemPrompt(
  webSearchEnabled: boolean,
  modelSupportsSearch: boolean,
  userEmail: string,
  threadPersona?: { personas: Persona } | null,
  userPreferences?: UserPreferences | null,
  isThinkingModel?: boolean,
  modelProvider?: string,
  modelId?: string
): string {
  let prompt = ""

  // Add persona-specific system prompt if available
  if (threadPersona?.personas?.system_prompt) {
    prompt += threadPersona.personas.system_prompt + "\n\n"
  }

  // Add user preferences if available
  if (userPreferences) {
    if (userPreferences.preferredName) {
      prompt += `Please address me as "${userPreferences.preferredName}". `
    }
    if (userPreferences.occupation) {
      prompt += `I work as a ${userPreferences.occupation}. `
    }
    if (userPreferences.assistantTraits && userPreferences.assistantTraits.length > 0) {
      prompt += `\nPlease be ${userPreferences.assistantTraits.join(", ")}. `
    }
    if (userPreferences.customInstructions) {
      prompt += `\n${userPreferences.customInstructions}`
    }
    prompt += "\n\n"
  }

  // Add web search instructions if enabled
  if (webSearchEnabled && modelSupportsSearch) {
    prompt += "You have access to real-time web search. Use it when you need current information or to verify facts.\n\n"
  }

  // Add thinking/reasoning instructions for models that support it
  if (isThinkingModel) {
    if (modelId?.includes("deepseek")) {
      prompt += `For complex reasoning or problem-solving tasks, use <think>...</think> tags to show your step-by-step thought process. Your thinking will be displayed separately from your final answer.

Example format:
<think>
Let me break this down step by step:
1. First, I need to understand what the user is asking...
2. Then I should consider the key factors...
3. Finally, I'll synthesize the information to provide a clear answer...
</think>

Your final, polished response goes here without the thinking tags.

Always use thinking tags for complex analysis, calculations, or multi-step reasoning.`
    } else if (modelProvider === "google") {
      prompt += `For complex reasoning tasks, think through your response step-by-step. Your reasoning process will be displayed separately from your final answer. Break down complex problems and explain your thought process clearly.`
    } else if (modelProvider === "openai") {
      prompt += `For complex reasoning tasks, engage your internal reasoning capabilities to think through problems step-by-step before providing your final answer.`
    } else {
      prompt += `For complex reasoning or problem-solving tasks, think through your response step-by-step and break down complex problems clearly.`
    }
    prompt += "\n\n"
  }

  return prompt.trim()
} 