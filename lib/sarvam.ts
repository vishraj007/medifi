// lib/sarvam.ts
// bulbul:v2 valid speakers: anushka, abhilash, manisha, vidya, arya, karun, hitesh
// meera/rupali are bulbul:v1 only — do NOT use with v2

export class SarvamClient {
  private apiKey: string
  private baseUrl = 'https://api.sarvam.ai'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  // Speech to Text — saarika:v2.5
  async transcribe(audioBlob: Blob, language: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('language_code', language)
    formData.append('model', 'saarika:v2.5')
    formData.append('with_timestamps', 'false')
    formData.append('with_disfluencies', 'false')

    const response = await fetch(`${this.baseUrl}/speech-to-text`, {
      method: 'POST',
      headers: { 'api-subscription-key': this.apiKey },
      body: formData
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('STT error:', response.status, error)
      throw new Error(`Transcription failed (${response.status}): ${error}`)
    }

    const data = await response.json()
    return data.transcript || ''
  }

  // Translation — mayura:v1
  async translate(text: string, sourceLang: string, targetLang: string = 'en-IN'): Promise<string> {
    if (!text || text.trim().length === 0) return text

    const response = await fetch(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        source_language_code: sourceLang,
        target_language_code: targetLang,
        speaker_gender: 'Male',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: false
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Translation error:', response.status, error)
      throw new Error(`Translation failed (${response.status}): ${error}`)
    }

    const data = await response.json()
    return data.translated_text || text
  }

  // Text to Speech — bulbul:v2
  // Valid speakers: anushka (f), abhilash (m), manisha (f), vidya (f), arya (f), karun (m), hitesh (m)
  async textToSpeech(
    text: string,
    language: string,
    options?: { speaker?: string; pitch?: number; pace?: number; loudness?: number }
  ): Promise<string> {
    const truncated = text.trim().substring(0, 490)

    const response = await fetch(`${this.baseUrl}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: [truncated],
        target_language_code: language,
        speaker: options?.speaker || 'anushka',  // ✅ valid v2 speaker
        pitch: options?.pitch ?? 0,
        pace: options?.pace ?? 1.0,
        loudness: options?.loudness ?? 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v2'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('TTS error:', response.status, error)
      throw new Error(`TTS failed (${response.status}): ${error}`)
    }

    const data = await response.json()
    return data.audios?.[0] || ''
  }

  static convertLanguageCode(code: 'ENGLISH' | 'HINDI' | 'KANNADA'): string {
    return { ENGLISH: 'en-IN', HINDI: 'hi-IN', KANNADA: 'kn-IN' }[code] || 'en-IN'
  }

  static getLanguageName(code: string): string {
    const map: Record<string, string> = {
      'en-IN': 'English', 'hi-IN': 'Hindi', 'kn-IN': 'Kannada',
      'ta-IN': 'Tamil', 'te-IN': 'Telugu'
    }
    return map[code] || code
  }
}

export const sarvam = new SarvamClient(process.env.SARVAM_API_KEY!)

export const LANGUAGE_CODES = {
  ENGLISH: 'en-IN',
  HINDI: 'hi-IN',
  KANNADA: 'kn-IN'
} as const

export type SupportedLanguage = keyof typeof LANGUAGE_CODES