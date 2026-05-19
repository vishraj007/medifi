// app/api/voice/transcribe/route.ts

import { NextRequest, NextResponse } from 'next/server'

const SARVAM_BASE_URL = 'https://api.sarvam.ai'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioBlob = formData.get('audio') as Blob
    const language = formData.get('language') as string

    if (!audioBlob) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
    }

    const langCodeMap: Record<string, string> = {
      'ENGLISH': 'en-IN',
      'HINDI': 'hi-IN',
      'KANNADA': 'kn-IN'
    }

    const langCode = langCodeMap[language] || 'en-IN'

    const apiKey = process.env.SARVAM_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SARVAM_API_KEY not set' }, { status: 500 })
    }

    const sarvamForm = new FormData()
    sarvamForm.append('file', audioBlob, 'audio.webm')
    sarvamForm.append('language_code', langCode)
    sarvamForm.append('model', 'saarika:v2.5')   // ✅ Updated to v2.5
    sarvamForm.append('with_timestamps', 'false')
    sarvamForm.append('with_disfluencies', 'false')

    console.log(`STT → saarika:v2.5 | lang=${langCode}`)

    const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey
        // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
      },
      body: sarvamForm
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Sarvam STT error ${response.status}:`, errorText)
      return NextResponse.json(
        { error: `Transcription failed (${response.status}): ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const transcript = data.transcript || ''

    console.log(`STT result: "${transcript.substring(0, 80)}..."`)

    return NextResponse.json({ transcript })

  } catch (error: any) {
    console.error('Transcribe route exception:', error)
    return NextResponse.json({ error: error.message || 'Transcription failed' }, { status: 500 })
  }
}