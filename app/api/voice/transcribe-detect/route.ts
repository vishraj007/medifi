// app/api/voice/transcribe-detect/route.ts
// Auto-detect language from audio using Sarvam saarika:v2.5

import { NextRequest, NextResponse } from 'next/server'

const SARVAM_BASE_URL = 'https://api.sarvam.ai'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioBlob = formData.get('audio') as Blob
    const language = formData.get('language') as string | null

    if (!audioBlob) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
    }

    const apiKey = process.env.SARVAM_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SARVAM_API_KEY not set' }, { status: 500 })
    }

    // If a specific language is provided, use it; otherwise use 'unknown' for auto-detect
    const langCodeMap: Record<string, string> = {
      'ENGLISH': 'en-IN',
      'HINDI': 'hi-IN',
      'KANNADA': 'kn-IN'
    }
    const langCode = language && langCodeMap[language] ? langCodeMap[language] : 'unknown'

    const sarvamForm = new FormData()
    sarvamForm.append('file', audioBlob, 'audio.webm')
    sarvamForm.append('language_code', langCode)
    sarvamForm.append('model', 'saarika:v2.5')
    sarvamForm.append('with_timestamps', 'false')
    sarvamForm.append('with_disfluencies', 'false')

    console.log(`STT (detect) → saarika:v2.5 | lang=${langCode}`)

    const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey
      },
      body: sarvamForm
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Sarvam STT-detect error ${response.status}:`, errorText)
      
      // If 'unknown' fails, fall back to 'en-IN'
      if (langCode === 'unknown') {
        console.log('Auto-detect failed, falling back to en-IN...')
        const fallbackForm = new FormData()
        fallbackForm.append('file', audioBlob, 'audio.webm')
        fallbackForm.append('language_code', 'en-IN')
        fallbackForm.append('model', 'saarika:v2.5')
        fallbackForm.append('with_timestamps', 'false')
        fallbackForm.append('with_disfluencies', 'false')

        const fbRes = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
          method: 'POST',
          headers: { 'api-subscription-key': apiKey },
          body: fallbackForm
        })

        if (fbRes.ok) {
          const fbData = await fbRes.json()
          return NextResponse.json({
            transcript: fbData.transcript || '',
            detectedLanguage: 'ENGLISH',
            languageCode: 'en-IN',
            autoDetected: false
          })
        }
      }

      return NextResponse.json(
        { error: `Transcription failed (${response.status}): ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const transcript = data.transcript || ''

    // Determine which language was detected
    let detectedLanguage = 'ENGLISH'
    let detectedLangCode = 'en-IN'

    if (language && langCodeMap[language]) {
      // User chose a specific language
      detectedLanguage = language
      detectedLangCode = langCodeMap[language]
    } else if (data.language_code) {
      // Sarvam returned detected lang
      detectedLangCode = data.language_code
      const reverseMap: Record<string, string> = {
        'en-IN': 'ENGLISH', 'hi-IN': 'HINDI', 'kn-IN': 'KANNADA'
      }
      detectedLanguage = reverseMap[data.language_code] || 'ENGLISH'
    } else {
      // Heuristic: check script to guess language from transcript text
      if (/[\u0C80-\u0CFF]/.test(transcript)) {
        detectedLanguage = 'KANNADA'
        detectedLangCode = 'kn-IN'
      } else if (/[\u0900-\u097F]/.test(transcript)) {
        detectedLanguage = 'HINDI'
        detectedLangCode = 'hi-IN'
      }
    }

    console.log(`STT-detect result: lang=${detectedLanguage} | "${transcript.substring(0, 80)}..."`)

    return NextResponse.json({
      transcript,
      detectedLanguage,
      languageCode: detectedLangCode,
      autoDetected: !language
    })

  } catch (error: any) {
    console.error('Transcribe-detect route exception:', error)
    return NextResponse.json({ error: error.message || 'Transcription failed' }, { status: 500 })
  }
}
