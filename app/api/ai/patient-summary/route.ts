// app/api/ai/patient-summary/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { groqWithFallback } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { sessions, personName, domain, language } = await req.json()

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ error: 'No session data provided' }, { status: 400 })
    }

    const isHC = domain === 'HEALTHCARE'
    const langMap: Record<string, string> = { KANNADA: 'Kannada (ಕನ್ನಡ)', ENGLISH: 'English', HINDI: 'Hindi (हिंदी)' }
    const targetLang = langMap[language] || langMap.KANNADA

    // Build a comprehensive context from all sessions
    const sessionSummaries = sessions.map((s: any, i: number) => {
      const date = new Date(s.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
      const dept = s.department?.replace(/_/g, ' ') || 'Unknown'
      const status = s.status || 'Unknown'
      const approved = s.approved ? ' (Approved)' : ''
      const hasReport = s.finalReport ? 'Yes' : 'No'

      const ner = s.nerEntities || {}
      const ed = s.extractedData || {}

      let entitySection = ''
      if (Object.keys(ner).length > 0) {
        entitySection = '\n  Extracted Entities:'
        Object.entries(ner).forEach(([cat, vals]) => {
          if (Array.isArray(vals) && vals.length > 0) {
            entitySection += `\n    ${cat}: ${vals.join(', ')}`
          }
        })
      }

      let dataSection = ''
      if (Object.keys(ed).length > 0) {
        if (ed.chiefComplaint) dataSection += `\n  Chief Complaint: ${ed.chiefComplaint}`
        if (ed.historyOfPresentIllness) dataSection += `\n  History: ${ed.historyOfPresentIllness}`
        if (ed.pastMedicalHistory) dataSection += `\n  Past Medical History: ${ed.pastMedicalHistory}`
        if (ed.allergies) dataSection += `\n  Allergies: ${ed.allergies}`
        if (ed.familyHistory) dataSection += `\n  Family History: ${ed.familyHistory}`
        if (ed.physicalExamination) dataSection += `\n  Physical Examination: ${ed.physicalExamination}`
        if (ed.currentMedications?.length) dataSection += `\n  Medications: ${ed.currentMedications.join(', ')}`
        if (ed.vitals) {
          const v = ed.vitals
          const vitalsStr = Object.entries(v).filter(([, val]) => val && val !== 'null').map(([k, val]) => `${k}: ${val}`).join(', ')
          if (vitalsStr) dataSection += `\n  Vitals: ${vitalsStr}`
        }
        // Finance-specific
        if (ed.clientGoals?.length) dataSection += `\n  Client Goals: ${ed.clientGoals.join('; ')}`
        if (ed.riskProfile) dataSection += `\n  Risk Profile: ${ed.riskProfile}`
        if (ed.summary) dataSection += `\n  Summary: ${ed.summary}`
      }

      // Include snippet of final report if exists (first 600 chars text only)
      let reportSnippet = ''
      if (s.finalReport) {
        const textOnly = s.finalReport.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        reportSnippet = `\n  Report Excerpt: ${textOnly.slice(0, 600)}...`
      }

      return `--- Visit ${i + 1}: ${date} ---
  Department: ${dept}
  Status: ${status}${approved}
  Report Generated: ${hasReport}${dataSection}${entitySection}${reportSnippet}`
    }).join('\n\n')

    const prompt = isHC
      ? `You are a senior physician reviewing the complete medical history of a patient.

Patient Name: ${personName || 'Unknown'}
Total Visits: ${sessions.length}
Domain: Healthcare

=== ALL VISIT DATA ===
${sessionSummaries}
=== END ===

Based on ALL the visit data above, write a comprehensive patient health summary in clean HTML.

Structure your response with these sections:
<h3>📋 Patient Profile Summary</h3>
<p>Brief overview of the patient — age, conditions, visit frequency, departments visited.</p>

<h3>🔄 Recurring Patterns</h3>
<p>Symptoms or conditions that appeared across multiple visits. Flag any chronic or worsening patterns.</p>

<h3>💊 Medication History</h3>
<p>All medications prescribed across visits. Note any changes, additions, or discontinuations over time.</p>

<h3>📈 Health Trajectory</h3>
<p>How is the patient's health trending? Improving, stable, or deteriorating? Base this on symptoms and visit patterns.</p>

<h3>⚠️ Risk Factors & Alerts</h3>
<p>Any concerns — recurring symptoms that weren't resolved, drug interactions, gaps in follow-up, or red flags.</p>

<h3>🎯 Recommended Actions</h3>
<ul><li>Specific, actionable next steps for the treating physician</li></ul>

Rules:
- Write clean HTML only. No markdown. No backticks.
- Base EVERYTHING on the actual data provided. Do not invent symptoms or diagnoses.
- If data is sparse, say so honestly.
- Be specific — reference actual dates, medications, and symptoms from the visits.
- Use <p>, <ul>, <li>, <strong> tags. Keep it professional and clinically useful.

CRITICAL LANGUAGE RULE: Write ALL text content (inside <p>, <li>, <strong> tags) in ${targetLang}. 
The <h3> section headings with emojis must stay in English for CSS matching, but ALL paragraph and list content MUST be in ${targetLang}.
Use proper ${targetLang} medical/clinical terminology. If the language is Kannada or Hindi, transliterate drug names but describe everything else natively.`

      : `You are a senior financial advisor reviewing the complete consultation history of a client.

Client Name: ${personName || 'Unknown'}
Total Consultations: ${sessions.length}
Domain: Finance

=== ALL CONSULTATION DATA ===
${sessionSummaries}
=== END ===

Based on ALL the consultation data above, write a comprehensive client financial summary in clean HTML.

Structure your response with these sections:
<h3>📋 Client Profile Summary</h3>
<p>Brief overview — financial goals, risk profile, consultation frequency.</p>

<h3>🔄 Recurring Themes</h3>
<p>Topics or concerns that appeared across multiple consultations.</p>

<h3>💰 Investment & Portfolio History</h3>
<p>All financial instruments, investments, and strategies discussed across sessions.</p>

<h3>📈 Financial Trajectory</h3>
<p>How is the client's financial health trending? Are goals being met?</p>

<h3>⚠️ Risk Factors & Alerts</h3>
<p>Tax deadlines, overexposure, insurance gaps, or underperforming areas.</p>

<h3>🎯 Recommended Actions</h3>
<ul><li>Specific next steps for the advisor</li></ul>

Rules:
- Write clean HTML only. No markdown. No backticks.
- Base EVERYTHING on actual data. Do not invent numbers.
- Be specific — reference actual dates, amounts, and strategies.

CRITICAL LANGUAGE RULE: Write ALL text content (inside <p>, <li>, <strong> tags) in ${targetLang}.
The <h3> section headings with emojis must stay in English for CSS matching, but ALL paragraph and list content MUST be in ${targetLang}.
Use proper ${targetLang} financial terminology.`

    const response = await groqWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 3000,
    }) as any

    let summary = (response.choices?.[0]?.message?.content || '') as string
    summary = summary.replace(/```html/gi, '').replace(/```/g, '').trim()

    return NextResponse.json({ summary })

  } catch (error: any) {
    console.error('Patient summary error:', error)
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limited — please try again in a moment' },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
