// app/api/ai/label-speakers/route.ts
// Uses Groq to label each sentence in a transcript as "doctor" or "patient"

import { NextRequest, NextResponse } from 'next/server'
import { groqWithFallback } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { sentences, domain, department } = await req.json()

    if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
      return NextResponse.json({ error: 'sentences array required' }, { status: 400 })
    }

    const numberedSentences = sentences
      .map((s: string, i: number) => `${i + 1}. "${s}"`)
      .join('\n')

    const domainContext = domain === 'HEALTHCARE'
      ? `This is a medical consultation between a doctor and a patient in the ${(department || 'general').replace(/_/g, ' ')} department.`
      : `This is a financial consultation between a financial advisor (doctor role) and a client (patient role) in ${(department || 'general').replace(/_/g, ' ')}.`

    const prompt = `${domainContext}

Below is a transcript of a conversation. Each line is a separate statement spoken during the session. Your job is to classify WHO said each statement — either "doctor" or "patient".

**Guidelines:**
- Questions about symptoms, medical history, lifestyle, health status, medications, side effects → typically asked by the DOCTOR
- Answers describing personal symptoms, feelings, pain, duration of illness, personal history → typically said by the PATIENT
- Medical advice, prescriptions, diagnoses, recommendations, follow-up instructions → typically said by the DOCTOR
- Greetings and introductions like "I am Dr. ..." → DOCTOR
- Greetings like "Hello doctor", "I have been having..." → PATIENT
- For finance domain: questions about income, investments, goals → ADVISOR (label as "doctor"), answers about personal finances → CLIENT (label as "patient")

**Transcript:**
${numberedSentences}

Return ONLY a JSON object in this exact format:
{
  "labels": [
    { "index": 0, "speaker": "doctor" },
    { "index": 1, "speaker": "patient" },
    ...
  ]
}

Rules:
- "index" is 0-based (first sentence = 0)
- "speaker" must be exactly "doctor" or "patient"
- Label ALL ${sentences.length} sentences
- Use context clues from the conversation flow (doctors ask, patients answer)
- If unsure, alternate based on typical consultation flow (doctor speaks first, then patient responds)`

    const response = await groqWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      stream: false,
    }, false) as any // use FAST model since this is a classification task

    const result = JSON.parse(response.choices[0].message.content!)
    const labels: Array<{ index: number; speaker: 'doctor' | 'patient' }> = result.labels || []

    // Validate and fill gaps — ensure every sentence has a label
    const finalLabels = sentences.map((_: string, i: number) => {
      const found = labels.find(l => l.index === i)
      if (found && (found.speaker === 'doctor' || found.speaker === 'patient')) {
        return found.speaker
      }
      // Fallback: alternate starting with doctor
      return i % 2 === 0 ? 'doctor' : 'patient'
    })

    return NextResponse.json({ labels: finalLabels })
  } catch (error: any) {
    console.error('Speaker labeling error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to label speakers' },
      { status: 500 }
    )
  }
}
