// app/api/voice/translate-all/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { sarvam } from '@/lib/sarvam'

const LANG_MAP: Record<string, string> = {
  'en-IN': 'ENGLISH',
  'hi-IN': 'HINDI',
  'kn-IN': 'KANNADA'
}

const ALL_LANG_CODES = ['en-IN', 'hi-IN', 'kn-IN']

export async function POST(req: NextRequest) {
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { text, sourceLang } = body

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  if (!sourceLang || !LANG_MAP[sourceLang]) {
    return NextResponse.json({ error: `Invalid sourceLang: ${sourceLang}` }, { status: 400 })
  }

  // Initialize all keys with original text as fallback
  const translations: Record<string, string> = {
    ENGLISH: text,
    HINDI: text,
    KANNADA: text
  }

  // Source language gets the original text directly
  translations[LANG_MAP[sourceLang]] = text

  // Only translate to the other 2 languages
  const targetLangs = ALL_LANG_CODES.filter(l => l !== sourceLang)

  const results = await Promise.allSettled(
    targetLangs.map(async (targetLang) => {
      const translated = await sarvam.translate(text, sourceLang, targetLang)
      return { key: LANG_MAP[targetLang], text: translated }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value?.text) {
      translations[result.value.key] = result.value.text
    } else if (result.status === 'rejected') {
      console.error('Translation failed for one language:', result.reason)
      // Keep the fallback (original text) for that language
    }
  }

  console.log('translate-all result keys:', Object.keys(translations), 
    'ENGLISH length:', translations.ENGLISH?.length,
    'HINDI length:', translations.HINDI?.length)

  return NextResponse.json({ translations })
}