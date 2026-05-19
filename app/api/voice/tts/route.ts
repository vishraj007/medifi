// app/api/voice/tts/route.ts
// FIX: bulbul:v2 valid speakers are: anushka, abhilash, manisha, vidya, arya, karun, hitesh
// meera/rupali were bulbul:v1 speakers — they cause 400 Bad Request on v2

import { NextRequest, NextResponse } from 'next/server'

const SARVAM_BASE_URL = 'https://api.sarvam.ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, language } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const langCodeMap: Record<string, string> = {
      'ENGLISH': 'en-IN',
      'HINDI': 'hi-IN',
      'KANNADA': 'kn-IN'
    }

    const targetLang = langCodeMap[language as string]
    if (!targetLang) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 })
    }

    const apiKey = process.env.SARVAM_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SARVAM_API_KEY not set' }, { status: 500 })
    }

    const truncated = text.trim().substring(0, 490)

    const requestBody = {
      inputs: [truncated],
      target_language_code: targetLang,
      speaker: 'anushka',      // ✅ Valid bulbul:v2 speaker (meera/rupali were v1 only)
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: 'bulbul:v2'
    }

    console.log(`TTS → bulbul:v2 | speaker=anushka | lang=${targetLang} | chars=${truncated.length}`)

    const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Sarvam TTS error ${response.status}:`, errorText)
      let msg = `TTS failed (${response.status})`
      try { msg = JSON.parse(errorText)?.message || msg } catch {}
      return NextResponse.json({ error: msg }, { status: response.status })
    }

    const data = await response.json()
    const audioBase64 = data.audios?.[0]

    if (!audioBase64) {
      console.error('Sarvam TTS: no audio in response', JSON.stringify(data).slice(0, 200))
      return NextResponse.json({ error: 'No audio returned' }, { status: 500 })
    }

    return NextResponse.json({ audio: audioBase64 })

  } catch (error: any) {
    console.error('TTS route exception:', error)
    return NextResponse.json({ error: error.message || 'TTS failed' }, { status: 500 })
  }
}