// app/api/ai/extract-entities/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { extractMedicalEntitiesHF, hasSubwordFragments } from '@/lib/huggingface/ner'
import { extractMedicalEntities as extractWithGroq } from '@/lib/ner/medical-ner'
import { extractFinanceEntities } from '@/lib/ner/finance-ner'

export async function POST(req: NextRequest) {
  try {
    const { text, useHuggingFace = true, domain = 'HEALTHCARE' } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    let entities

    if (domain === 'FINANCE') {
      console.log('Extracting finance entities with Groq...')
      entities = await extractFinanceEntities(text)

    } else {
      // ── Healthcare: HuggingFace first, Groq as fallback ─────────────────
      if (useHuggingFace && process.env.HUGGINGFACE_API_KEY) {
        console.log('Using Hugging Face NER for healthcare...')
        entities = await extractMedicalEntitiesHF(text)

        const isEmpty = Object.values(entities).every((arr: any) => arr.length === 0)
        const hasFragments = hasSubwordFragments(entities)

        if (isEmpty || hasFragments) {
          console.log(
            isEmpty ? 'HF returned empty' : 'HF returned subword fragments',
            '— falling back to Groq...'
          )
          entities = await extractWithGroq(text)
        } else {
          console.log('HF extraction successful, skipping Groq.')
        }
      } else {
        console.log('Using Groq NER for healthcare...')
        entities = await extractWithGroq(text)
      }
    }

    return NextResponse.json({ entities })
  } catch (error: any) {
    console.error('Entity extraction error:', error)
    return NextResponse.json(
      { error: error.message || 'Entity extraction failed' },
      { status: 500 }
    )
  }
}