// app/api/ai/translate-report/route.ts
// Primary: Sarvam AI (mayura:v1) — translates text nodes in HTML preserving all tags
// Fallback: Groq (llama-3.3-70b) — if Sarvam fails

import { NextRequest, NextResponse } from 'next/server'
import { sarvam } from '@/lib/sarvam'
import { groq, MODELS } from '@/lib/groq'

const LANG_CODE: Record<string, string> = {
  HINDI:   'hi-IN',
  KANNADA: 'kn-IN',
}

const LANG_NAME: Record<string, string> = {
  HINDI:   'Hindi',
  KANNADA: 'Kannada',
}

// ── Sarvam approach: translate visible text chunks, swap back into HTML ─────
// We extract unique text nodes, batch-translate them, then substitute back.
// This preserves all HTML tags perfectly.
async function translateWithSarvam(html: string, targetLang: string): Promise<string> {
  const langCode = LANG_CODE[targetLang]
  if (!langCode) throw new Error(`Unsupported language: ${targetLang}`)

  // Collect all text segments between tags (skip empty/whitespace-only)
  const segments: string[] = []
  const segmentRegex = />([^<]+)</g
  let match: RegExpExecArray | null

  while ((match = segmentRegex.exec(html)) !== null) {
    const text = match[1].trim()
    if (text.length > 1 && !/^\d+$/.test(text)) {
      segments.push(text)
    }
  }

  if (segments.length === 0) return html

  // Deduplicate while preserving order
  const unique = [...new Set(segments)]

  // Sarvam has a ~1000-char limit per call; batch into chunks
  const CHUNK_SIZE = 3
  const translationMap: Map<string, string> = new Map()

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const batch = unique.slice(i, i + CHUNK_SIZE)
    await Promise.all(
      batch.map(async (text) => {
        try {
          const translated = await sarvam.translate(text, 'en-IN', langCode)
          translationMap.set(text, translated)
        } catch {
          translationMap.set(text, text) // keep original on failure
        }
      })
    )
  }

  // Swap translated text back into HTML
  let result = html
  for (const [original, translated] of translationMap) {
    if (original !== translated) {
      // Replace all occurrences within text nodes (between tags)
      result = result.split(`>${original}<`).join(`>${translated}<`)
    }
  }

  return result
}

// ── Groq fallback: send entire HTML, ask it to translate text-only ──────────
async function translateWithGroq(html: string, targetLang: string): Promise<string> {
  const langName = LANG_NAME[targetLang] || targetLang
  const langCode = LANG_CODE[targetLang] || targetLang

  const prompt = `You are an expert medical/financial translator. Translate the text content inside the following HTML to ${langName} (${langCode}).

CRITICAL RULES:
1. Preserve ALL HTML tags, attributes, class names, data-* attributes EXACTLY as-is
2. Only translate visible text content between tags — never translate tag names, attributes, or class values
3. Keep proper nouns (person names, department names, drug names, organization names) in their original form or transliterate them
4. Keep numbers, dates, measurements, symbols (mg, kg, mmHg, %, |, •) unchanged
5. Return ONLY the translated HTML — no explanations, no markdown, no code fences
6. Medical/financial terms should be accurately translated with proper terminology
7. Keep the translation natural and fluent, not word-for-word literal

HTML to translate:
${html}`

  const response = await groq.chat.completions.create({
    model: MODELS.SMART,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 8000,
  })

  let translatedHtml = response.choices[0].message.content!.trim()
  translatedHtml = translatedHtml
    .replace(/^```html\n?/i, '')
    .replace(/^```\n?/, '')
    .replace(/\n?```$/, '')
    .trim()

  return translatedHtml
}

export async function POST(req: NextRequest) {
  try {
    const { html, targetLang } = await req.json()

    if (!html || !targetLang) {
      return NextResponse.json({ error: 'Missing html or targetLang' }, { status: 400 })
    }

    if (targetLang === 'ENGLISH') {
      return NextResponse.json({ translatedHtml: html })
    }

    // ── Try Sarvam first (better for Indian languages, no daily token limits) ──
    try {
      console.log(`[translate-report] Using Sarvam for ${targetLang}`)
      const translatedHtml = await translateWithSarvam(html, targetLang)
      return NextResponse.json({ translatedHtml, provider: 'sarvam' })
    } catch (sarvamErr: any) {
      console.warn('[translate-report] Sarvam failed, trying Groq:', sarvamErr.message)
    }

    // ── Fallback to Groq ────────────────────────────────────────────────────
    try {
      console.log(`[translate-report] Using Groq fallback for ${targetLang}`)
      const translatedHtml = await translateWithGroq(html, targetLang)
      return NextResponse.json({ translatedHtml, provider: 'groq' })
    } catch (groqErr: any) {
      console.error('[translate-report] Groq also failed:', groqErr.message)
      // Return rate-limit-specific error so frontend can show a good message
      const isRateLimit = groqErr?.status === 429 || groqErr?.message?.includes('rate_limit')
      return NextResponse.json(
        {
          error: isRateLimit
            ? 'RATE_LIMIT'
            : 'Translation failed',
          details: groqErr.message
        },
        { status: isRateLimit ? 429 : 500 }
      )
    }
  } catch (error: any) {
    console.error('Translate report error:', error)
    return NextResponse.json({ error: 'Translation failed', details: error.message }, { status: 500 })
  }
}
