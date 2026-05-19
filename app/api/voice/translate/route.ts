// app/api/voice/translate/route.ts

import { NextRequest, NextResponse } from 'next/server'

const SARVAM_BASE_URL = 'https://api.sarvam.ai'

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLang } = await req.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ translated: text || '' })
    }

    // If already English, no translation needed
    if (sourceLang === 'en-IN') {
      return NextResponse.json({ translated: text })
    }

    const apiKey = process.env.SARVAM_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SARVAM_API_KEY not set' }, { status: 500 })
    }

    const response = await fetch(`${SARVAM_BASE_URL}/translate`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        source_language_code: sourceLang,
        target_language_code: 'en-IN',
        speaker_gender: 'Male',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Sarvam translate error ${response.status}:`, errorText)
      // Return original as fallback rather than erroring
      return NextResponse.json({ translated: text })
    }

    const data = await response.json()
    return NextResponse.json({ translated: data.translated_text || text })

  } catch (error: any) {
    console.error('Translate route exception:', error)
    return NextResponse.json({ translated: '' })
  }
}