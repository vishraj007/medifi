// app/api/ai/suggest-questions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { groqWithFallback } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { context, messages, domain, department, extractedData, nerEntities, pastSessionContext } = await req.json()

    const conversationHistory = messages
      ?.map((m: any) => `${m.speaker === 'doctor' ? 'Doctor' : 'Patient'}: ${m.text}`)
      .join('\n') || ''

    // Build past history context if available
    let pastHistoryBlock = ''
    if (pastSessionContext?.sessions?.length > 0) {
      const pastDetails = pastSessionContext.sessions.map((s: any) => {
        const parts = [`Session date: ${s.date}`, `Department: ${s.department}`]
        if (s.summary) parts.push(`Summary: ${s.summary}`)
        if (s.entities?.symptoms?.length) parts.push(`Past symptoms: ${s.entities.symptoms.join(', ')}`)
        if (s.entities?.diseases?.length) parts.push(`Past diagnoses: ${s.entities.diseases.join(', ')}`)
        if (s.entities?.medications?.length) parts.push(`Past medications: ${s.entities.medications.join(', ')}`)
        if (s.entities?.procedures?.length) parts.push(`Past procedures: ${s.entities.procedures.join(', ')}`)
        // Finance entities
        if (s.entities?.investments?.length) parts.push(`Past investments: ${s.entities.investments.join(', ')}`)
        if (s.entities?.goals?.length) parts.push(`Past goals: ${s.entities.goals.join(', ')}`)
        if (s.entities?.loans?.length) parts.push(`Past loans: ${s.entities.loans.join(', ')}`)
        if (s.entities?.insurance?.length) parts.push(`Past insurance: ${s.entities.insurance.join(', ')}`)
        // Extracted data highlights
        const ed = s.extractedData || {}
        if (ed.chiefComplaint) parts.push(`Past chief complaint: ${ed.chiefComplaint}`)
        if (ed.riskProfile) parts.push(`Past risk profile: ${ed.riskProfile}`)
        return parts.join('\n')
      }).join('\n---\n')

      pastHistoryBlock = `\n\n**Patient/Client History from Previous Sessions (${pastSessionContext.sessionCount} past sessions):**
${pastDetails}

IMPORTANT: Use the patient's past history to ask more informed, personalized follow-up questions. Reference past conditions, medications, or financial situations when relevant.`
    }

    const prompt = domain === 'HEALTHCARE' 
      ? `You are an AI assistant helping a ${department.replace('_', ' ')} doctor conduct a patient interview.

CRITICAL RULES:
- You are ONLY suggesting questions for the doctor to ask. Do NOT provide diagnoses, medical opinions, or your own feedback.
- Do NOT suggest treatments or give medical advice.
- Only suggest questions that help the doctor gather more information.

**Conversation so far:**
${conversationHistory}

**Already extracted symptoms/conditions:**
${JSON.stringify(nerEntities, null, 2)}

**Extracted data:**
${JSON.stringify(extractedData, null, 2)}
${pastHistoryBlock}

Based on the conversation, generate 3-5 smart follow-up questions the doctor should ask to:
1. Clarify symptoms
2. Understand severity and duration
3. Identify risk factors
4. Complete medical history
${pastSessionContext?.sessionCount > 0 ? '5. Follow up on conditions from previous visits' : ''}

Return ONLY a JSON object: { "questions": ["question1", "question2", ...] }

Questions should be:
- Direct and medical
- Build on previous answers
- Help with diagnosis
${pastSessionContext?.sessionCount > 0 ? '- Reference past medical history when relevant (e.g., "In your last visit you mentioned X, has that improved?")' : ''}`
      : `You are an AI assistant helping a ${department.replace('_', ' ')} financial advisor.

CRITICAL RULES:
- You are ONLY suggesting questions for the advisor to ask. Do NOT provide financial advice, opinions, or your own feedback.
- Do NOT recommend specific investments or strategies.
- Only suggest questions that help the advisor gather more information.

**Conversation so far:**
${conversationHistory}

**Extracted data:**
${JSON.stringify(extractedData, null, 2)}
${pastHistoryBlock}

Based on the conversation, generate 3-5 smart follow-up questions to:
1. Understand financial goals
2. Assess risk profile
3. Know current financial situation
4. Identify tax optimization opportunities
${pastSessionContext?.sessionCount > 0 ? '5. Follow up on financial matters from previous consultations' : ''}

Return ONLY a JSON object: { "questions": ["question1", "question2", ...] }
${pastSessionContext?.sessionCount > 0 ? '\nQuestions should reference past financial history when relevant.' : ''}`

    const response = await groqWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }, true)

    const result = JSON.parse(response.choices[0].message.content!)

    return NextResponse.json({ questions: result.questions || [] })
  } catch (error) {
    console.error('Question generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}