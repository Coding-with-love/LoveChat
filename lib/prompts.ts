import type { Persona } from "@/lib/supabase/types"
import type { UserPreferences } from "@/frontend/stores/UserPreferencesStore"

export function getSystemPrompt(
  webSearchEnabled: boolean,
  modelSupportsSearch: boolean,
  userEmail: string,
  threadPersona?: { personas: Persona } | null,
  userPreferences?: UserPreferences | null,
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
  prompt += `When performing complex reasoning or problem-solving:

1. For DeepSeek models: Use <think>...</think> tags to show your reasoning process. Example:
   <think>
   1. First, let me analyze the key aspects...
   2. Next, I'll consider the implications...
   3. Finally, I'll synthesize a solution...
   </think>
   [Your final answer here]

2. For other models: Follow their native reasoning formats.

Always break down complex problems into steps and explain your thought process clearly.`

  return prompt.trim()
} 