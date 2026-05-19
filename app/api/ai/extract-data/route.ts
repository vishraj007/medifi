// app/api/ai/extract-data/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { groq, MODELS } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { transcript, domain, department, schema } = await req.json()

    const prompt = `Extract structured data from this conversation:

${transcript}

**Target Schema:**
${JSON.stringify(schema, null, 2)}

Return ONLY valid JSON matching the schema. Use null for missing values.`

   const response = await groq.chat.completions.create({
  model: MODELS.SMART,
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.2,
  response_format: { type: 'json_object' }
})

    const extractedData = JSON.parse(response.choices[0].message.content!)

    return NextResponse.json({ extractedData })
  } catch (error) {
    console.error('Data extraction error:', error)
    return NextResponse.json(
      { error: 'Data extraction failed' },
      { status: 500 }
    )
  }
}