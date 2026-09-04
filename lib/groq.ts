// lib/groq.ts

import Groq from 'groq-sdk'
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export const MODELS = {
  // Use compound-mini for NER and light tasks — fast & efficient
  FAST: 'groq/compound-mini',

  // Use compound for summaries, extraction, and complex reasoning
  SMART: 'groq/compound',

  // Fallback chain across active Groq models
  FALLBACKS: [
    'groq/compound',
    'groq/compound-mini',
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
  ],

  SMALL: 'groq/compound-mini',
}

/**
 * Call Groq with automatic model fallback on 404 / 429 / 400 errors.
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

  const uniqueModels = Array.from(new Set(modelsToTry))

  let lastError: any
  for (const model of uniqueModels) {
    try {
      console.log(`Trying Groq model: ${model}`)
      const response = await groq.chat.completions.create({
        ...params,
        model,
        stream: false, // explicitly force non-streaming so TS resolves to ChatCompletion
      })
      return response as ChatCompletion
    } catch (err: any) {
      console.warn(`Groq model ${model} failed (${err?.status || err?.message}), attempting fallback...`)
      lastError = err

      // If failed with 400 and response_format was set (e.g. gemma2 or model without json_object support), retry without response_format
      if (err?.status === 400 && params.response_format) {
        try {
          console.log(`Retrying Groq model ${model} without response_format...`)
          const { response_format, ...paramsWithoutFormat } = params
          const response = await groq.chat.completions.create({
            ...paramsWithoutFormat,
            model,
            stream: false,
          })
          return response as ChatCompletion
        } catch (retryErr: any) {
          console.warn(`Retry without response_format on ${model} also failed: ${retryErr?.message}`)
          lastError = retryErr
        }
      }

      continue
    }
  }
  throw lastError // all models exhausted
}