// lib/groq.ts

import Groq from 'groq-sdk'
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export const MODELS = {
  // Use 8b for NER and light tasks — much cheaper on TPD
  FAST: 'llama-3.1-8b-instant',

  // Use for summaries and complex reasoning
  SMART: 'llama-3.3-70b-versatile',

  // Fallback chain when rate limited
  FALLBACKS: [
    'llama-3.1-8b-instant',   // cheapest, fastest
    'gemma2-9b-it',           // Google's model, separate quota
    'mixtral-8x7b-32768',     // Mistral, separate quota
  ],

  MIXTRAL: 'mixtral-8x7b-32768',
  SMALL: 'gemma2-9b-it',
}

/**
 * Call Groq with automatic model fallback on 429 rate limit.
 * Always non-streaming — returns a full ChatCompletion with .choices populated.
 * Tries SMART first, then each model in FALLBACKS.
 */
export async function groqWithFallback(
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'>,
  preferSmart = true
): Promise<ChatCompletion> {
  const modelsToTry = preferSmart
    ? [MODELS.SMART, ...MODELS.FALLBACKS]
    : [MODELS.FAST, ...MODELS.FALLBACKS]

  let lastError: any
  for (const model of modelsToTry) {
    try {
      console.log(`Trying Groq model: ${model}`)
      const response = await groq.chat.completions.create({
        ...params,
        model,
        stream: false, // explicitly force non-streaming so TS resolves to ChatCompletion
      })
      return response as ChatCompletion
    } catch (err: any) {
      if (err?.status === 429) {
        console.warn(`Rate limited on ${model}, trying next fallback...`)
        lastError = err
        continue
      }
      throw err // non-429 errors bubble up immediately
    }
  }
  throw lastError // all models exhausted
}