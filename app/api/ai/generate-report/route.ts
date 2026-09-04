// app/api/ai/generate-report/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { groqWithFallback } from '@/lib/groq'
import { extractMedicalEntities } from '@/lib/ner/medical-ner'
import { hashPII } from '@/lib/hash-pii'

const SECTION_COLORS: Record<string, { dark: string; light: string; icon: string }> = {
  'Differential Diagnosis':     { dark: '#60A5FA', light: '#1d4ed8', icon: '⊕' },
  'Most Likely Diagnosis':      { dark: '#34D399', light: '#065f46', icon: '✓' },
  'Recommended Investigations': { dark: '#FBBF24', light: '#92400e', icon: '🔬' },
  'Treatment Plan':             { dark: '#F472B6', light: '#9d174d', icon: '💊' },
  'Follow-up Recommendations':  { dark: '#A78BFA', light: '#4c1d95', icon: '📅' },
  'Red Flags':                  { dark: '#F87171', light: '#991b1b', icon: '⚠' },
}

// Translated section names for healthcare reports
const SECTION_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Differential Diagnosis':     { KANNADA: 'ವಿಭೇದಾತ್ಮಕ ರೋಗನಿರ್ಣಯ',    HINDI: 'विभेदक निदान' },
  'Most Likely Diagnosis':      { KANNADA: 'ಅತ್ಯಂತ ಸಂಭಾವ್ಯ ರೋಗನಿರ್ಣಯ', HINDI: 'सबसे संभावित निदान' },
  'Recommended Investigations': { KANNADA: 'ಶಿಫಾರಸು ಮಾಡಿದ ತನಿಖೆಗಳು',  HINDI: 'अनुशंसित जाँचें' },
  'Treatment Plan':             { KANNADA: 'ಚಿಕಿತ್ಸಾ ಯೋಜನೆ',           HINDI: 'उपचार योजना' },
  'Follow-up Recommendations':  { KANNADA: 'ಅನುಸರಣಾ ಶಿಫಾರಸುಗಳು',      HINDI: 'अनुवर्ती सिफारिशें' },
  'Red Flags':                  { KANNADA: 'ಎಚ್ಚರಿಕೆ ಸಂಕೇತಗಳು',        HINDI: 'खतरे के संकेत' },
}

// Translated section names for finance reports
const FIN_SECTION_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Financial Health Assessment':      { KANNADA: 'ಆರ್ಥಿಕ ಆರೋಗ್ಯ ಮೌಲ್ಯಮಾಪನ',       HINDI: 'वित्तीय स्वास्थ्य मूल्यांकन' },
  'Investment Strategy':              { KANNADA: 'ಹೂಡಿಕೆ ತಂತ್ರ',                    HINDI: 'निवेश रणनीति' },
  'Risk Analysis':                    { KANNADA: 'ರಿಸ್ಕ್ ವಿಶ್ಲೇಷಣೆ',                HINDI: 'जोखिम विश्लेषण' },
  'Tax Planning Strategy':            { KANNADA: 'ತೆರಿಗೆ ಯೋಜನಾ ತಂತ್ರ',              HINDI: 'कर नियोजन रणनीति' },
  'Debt Management Plan':             { KANNADA: 'ಸಾಲ ನಿರ್ವಹಣೆ ಯೋಜನೆ',              HINDI: 'ऋण प्रबंधन योजना' },
  'Retirement & Long-term Planning':  { KANNADA: 'ನಿವೃತ್ತಿ ಮತ್ತು ದೀರ್ಘಾವಧಿ ಯೋಜನೆ', HINDI: 'सेवानिवृत्ति और दीर्घकालिक योजना' },
}

export async function POST(req: NextRequest) {
  try {
    const {
      transcript,
      extractedData,
      nerEntities,
      domain,
      department,
      template,
      personName,
      personPhone,
      personEmail,
      language = 'ENGLISH',
    } = await req.json()

    if (!transcript || !domain || !department) {
      return NextResponse.json(
        { error: 'Missing required fields: transcript, domain, department' },
        { status: 400 }
      )
    }

    const langInstruction =
      language === 'KANNADA'
        ? `CRITICAL LANGUAGE RULE: You MUST write ALL paragraph text (<p>), ALL list items (<li>), and ALL explanations in Kannada (ಕನ್ನಡ) language ONLY.
- Every <p> tag content MUST be in Kannada.
- Every <li> tag content MUST be in Kannada.
- Do NOT write any English text inside <p> or <li> tags.
- Medical terms like drug names can remain in English, but all explanations must be Kannada.
- Section heading names inside <h3> tags MUST stay in English (for technical reasons).`
        : language === 'HINDI'
        ? `CRITICAL LANGUAGE RULE: You MUST write ALL paragraph text (<p>), ALL list items (<li>), and ALL explanations in Hindi (हिंदी) language ONLY.
- Every <p> tag content MUST be in Hindi.
- Every <li> tag content MUST be in Hindi.
- Do NOT write any English text inside <p> or <li> tags.
- Medical terms like drug names can remain in English, but all explanations must be Hindi.
- Section heading names inside <h3> tags MUST stay in English (for technical reasons).`
        : 'Write ALL text content in English.'

    let finalReport = ''

    if (domain === 'HEALTHCARE') {
      try {
        let entities = nerEntities
        if (!entities || Object.keys(entities).length === 0) {
          entities = await extractMedicalEntities(transcript)
        }

        const targetLangName = language === 'KANNADA' ? 'Kannada (ಕನ್ನಡ)' : language === 'HINDI' ? 'Hindi (हिंदी)' : 'English'
        const structuredPrompt = `Analyze this clinical consultation and extract structured information.
${language !== 'ENGLISH' ? `CRITICAL: Write ALL string values in ${targetLangName}. The chiefComplaint, historyOfPresentIllness, pastMedicalHistory, allergies, familyHistory, physicalExamination fields MUST be written in ${targetLangName}. Medication names can stay in English.` : ''}
CRITICAL:
- Only extract what was EXPLICITLY mentioned
- If denied (e.g. "no vomiting"), do NOT include it
- Never invent or infer

Conversation:
${transcript}

NER confirmed entities:
${JSON.stringify(entities, null, 2)}

Return JSON only:
{
  "chiefComplaint": "primary complaint as stated${language !== 'ENGLISH' ? ` — write in ${targetLangName}` : ''}",
  "historyOfPresentIllness": "symptom history in 1-2 sentences${language !== 'ENGLISH' ? ` — write in ${targetLangName}` : ''}",
  "pastMedicalHistory": "if mentioned, else null",
  "currentMedications": ["only explicitly mentioned medications"],
  "allergies": "if mentioned, else null",
  "familyHistory": "if mentioned, else null",
  "physicalExamination": "if mentioned, else null",
  "vitals": {
    "bp": "if mentioned, else null",
    "pulse": "if mentioned, else null",
    "temp": "if mentioned, else null",
    "spo2": "if mentioned, else null",
    "rr": "if mentioned, else null"
  }
}`

        const structuredResponse = await groqWithFallback({
          messages: [{ role: 'user', content: structuredPrompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' },
          max_tokens: 1500
        }, true)

        let sd: any = {}
        try {
          sd = JSON.parse(structuredResponse.choices[0].message.content!)
        } catch {
          sd = { chiefComplaint: 'See consultation notes', historyOfPresentIllness: transcript.substring(0, 200) }
        }

        const assessmentPrompt = `You are an experienced ${department.replace(/_/g, ' ')} physician.
Write a clinical assessment based ONLY on what was discussed.

CRITICAL RULES:
- Do NOT provide your own opinions, feedback, or speculative diagnoses beyond what was discussed in the conversation.
- Only summarize and structure information that was EXPLICITLY mentioned by the doctor or patient.
- Never add recommendations, treatments, or investigations that were NOT discussed by the professional.
- Do NOT inject your own medical advice or commentary.
- Base ONLY on confirmed symptoms. Do not include denied symptoms.

Confirmed symptoms: ${JSON.stringify(entities.symptoms)}
Confirmed diseases: ${JSON.stringify(entities.diseases)}
Confirmed procedures/tests: ${JSON.stringify(entities.procedures)}
Medications: ${JSON.stringify(entities.medications)}

Conversation:
${transcript}

Write clean HTML only. No markdown. No backticks.
Use EXACTLY these ENGLISH section names in <h3> tags (spelling must match exactly, DO NOT translate these heading names):
- Differential Diagnosis
- Most Likely Diagnosis
- Recommended Investigations
- Treatment Plan
- Follow-up Recommendations
- Red Flags

Format each section as:
<h3>Section Name In English</h3>
<p>explanation text here</p>
<ul><li>item here</li></ul>

${language !== 'ENGLISH' ? `ABSOLUTE REQUIREMENT — LANGUAGE:
The <h3> section headings MUST remain in English exactly as listed above.
But ALL other text — every <p> paragraph, every <li> list item, every explanation — MUST be written in ${targetLangName}.
Do NOT write English in <p> or <li> tags. Only ${targetLangName} is allowed there.
Medical/drug names (like "Paracetamol") may stay in English, but wrap them in a ${targetLangName} sentence.

Example for Kannada:
<h3>Treatment Plan</h3>
<p>ರೋಗಿಗೆ Paracetamol 500mg ಔಷಧಿಯನ್ನು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.</p>
<ul><li>Paracetamol 500mg - ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ</li></ul>` : ''}`

        const assessmentResponse = await groqWithFallback({
          messages: [{ role: 'user', content: assessmentPrompt }],
          temperature: 0.4,
          max_tokens: 2000
        }, true)

        let assessmentHtml = assessmentResponse.choices[0].message.content!
          .replace(/```html/gi, '').replace(/```/g, '').trim()

        // Match English section names and replace with translated names (keep data-section in English for CSS)
        Object.entries(SECTION_COLORS).forEach(([name, colors]) => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`<h3>\\s*${escaped}\\s*</h3>`, 'gi')
          const displayName = (language !== 'ENGLISH' && SECTION_TRANSLATIONS[name]?.[language]) || name
          assessmentHtml = assessmentHtml.replace(regex, `<h3 data-section="${name}">${displayName}</h3>`)
        })

        const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        const deptName = department.replace(/_/g, ' ')
        const medications = Array.isArray(sd.currentMedications)
          ? (sd.currentMedications.join(', ') || 'None')
          : (sd.currentMedications || 'None')

        const vitalsEntries = [
          sd.vitals?.bp    && `BP: ${sd.vitals.bp}`,
          sd.vitals?.pulse && `Pulse: ${sd.vitals.pulse}`,
          sd.vitals?.temp  && `Temp: ${sd.vitals.temp}`,
          sd.vitals?.spo2  && `SpO2: ${sd.vitals.spo2}`,
          sd.vitals?.rr    && `RR: ${sd.vitals.rr}`,
        ].filter(Boolean).join('  |  ')

        const reportTitle =
          language === 'KANNADA' ? 'ವೈದ್ಯಕೀಯ ಸಮಾಲೋಚನಾ ವರದಿ' :
          language === 'HINDI'   ? 'चिकित्सा परामर्श रिपोर्ट' :
          'MEDICAL CONSULTATION REPORT'

        const labelName       = language === 'KANNADA' ? 'ಹೆಸರು'       : language === 'HINDI' ? 'नाम'         : 'Name'
        const labelDate       = language === 'KANNADA' ? 'ದಿನಾಂಕ'      : language === 'HINDI' ? 'तारीख'       : 'Date'
        const labelDept       = language === 'KANNADA' ? 'ವಿಭಾಗ'       : language === 'HINDI' ? 'विभाग'       : 'Department'
        const labelMeds       = language === 'KANNADA' ? 'ಔಷಧಗಳು'     : language === 'HINDI' ? 'दवाइयाँ'     : 'Medications'
        const labelAllergies  = language === 'KANNADA' ? 'ಅಲರ್ಜಿಗಳು'  : language === 'HINDI' ? 'एलर्जी'      : 'Allergies'
        const labelVitals     = language === 'KANNADA' ? 'ಪ್ರಮುಖಾಂಶಗಳು': language === 'HINDI' ? 'महत्वपूर्ण' : 'Vitals'
        const labelPatient    = language === 'KANNADA' ? 'ರೋಗಿಯ ಮಾಹಿತಿ': language === 'HINDI' ? 'रोगी जानकारी': 'Patient Information'
        const labelComplaint  = language === 'KANNADA' ? 'ಮುಖ್ಯ ದೂರು'  : language === 'HINDI' ? 'मुख्य शिकायत': 'Chief Complaint'
        const labelHistory    = language === 'KANNADA' ? 'ವರ್ತಮಾನ ಕಾಯಿಲೆಯ ಇತಿಹಾಸ' : language === 'HINDI' ? 'वर्तमान बीमारी का इतिहास' : 'History of Present Illness'
        const labelPastHist   = language === 'KANNADA' ? 'ಹಿಂದಿನ ವೈದ್ಯಕೀಯ ಇತಿಹಾಸ' : language === 'HINDI' ? 'पिछला चिकित्सा इतिहास' : 'Past Medical History'
        const labelAssessment = language === 'KANNADA' ? 'ಕ್ಲಿನಿಕಲ್ ಮೌಲ್ಯಮಾಪನ ಮತ್ತು ಯೋಜನೆ' : language === 'HINDI' ? 'नैदानिक मूल्यांकन और योजना' : 'Clinical Assessment & Plan'
        const labelConfidential = language === 'KANNADA' ? 'ಗೌಪ್ಯ' : language === 'HINDI' ? 'गोपनीय' : 'Confidential'
        const labelGenerated  = language === 'KANNADA' ? 'ವಾಯ್ಸ್ ಇಂಟೆಲಿಜೆನ್ಸ್ ಸಿಸ್ಟಮ್ ಮೂಲಕ ರಚಿಸಲಾಗಿದೆ' : language === 'HINDI' ? 'वॉयस इंटेलिजेंस सिस्टम द्वारा उत्पन्न' : 'Generated by Voice Intelligence System'

        finalReport = `
<div class="rpt-wrap">
  <div class="rpt-header">
    <h1 class="rpt-title">${reportTitle}</h1>
    <p class="rpt-subtitle">${labelConfidential} &nbsp;•&nbsp; ${deptName}</p>
  </div>

  <div class="rpt-info-box">
    <h2 class="rpt-section-title rpt-section-title--blue">${labelPatient}</h2>
    <table class="rpt-table">
      <tr>
        <td class="rpt-td-label">${labelName}</td>
        <td class="rpt-td-value">${personName || 'Unknown'}</td>
        <td class="rpt-td-label">${labelDate}</td>
        <td class="rpt-td-value">${date}</td>
      </tr>
      <tr>
        <td class="rpt-td-label">${labelDept}</td>
        <td class="rpt-td-value">${deptName}</td>
        <td class="rpt-td-label">${labelMeds}</td>
        <td class="rpt-td-value">${medications}</td>
      </tr>
      ${sd.allergies ? `<tr>
        <td class="rpt-td-label">${labelAllergies}</td>
        <td class="rpt-td-value" colspan="3">${sd.allergies}</td>
      </tr>` : ''}
      ${vitalsEntries ? `<tr>
        <td class="rpt-td-label">${labelVitals}</td>
        <td class="rpt-td-value" colspan="3">${vitalsEntries}</td>
      </tr>` : ''}
    </table>
  </div>

  <div class="rpt-section">
    <h2 class="rpt-section-title rpt-section-title--blue">${labelComplaint}</h2>
    <p class="rpt-body">${sd.chiefComplaint || 'Not specified'}</p>
  </div>

  <div class="rpt-section">
    <h2 class="rpt-section-title rpt-section-title--blue">${labelHistory}</h2>
    <p class="rpt-body">${sd.historyOfPresentIllness || 'Not documented'}</p>
  </div>

  ${sd.pastMedicalHistory ? `<div class="rpt-section">
    <h2 class="rpt-section-title rpt-section-title--blue">${labelPastHist}</h2>
    <p class="rpt-body">${sd.pastMedicalHistory}</p>
  </div>` : ''}

  <div class="rpt-section rpt-assessment">
    <h2 class="rpt-section-title rpt-section-title--green">${labelAssessment}</h2>
    <div class="rpt-assessment-body">${assessmentHtml}</div>
  </div>

  <div class="rpt-footer">
    ${labelGenerated} &nbsp;|&nbsp; ${date}
  </div>
</div>

<style>
.rpt-wrap { font-family: Georgia, 'Times New Roman', serif; max-width: 780px; }
.rpt-header { text-align: center; border-bottom: 2px solid; padding-bottom: 12px; margin-bottom: 20px; }
.rpt-title { font-size: 1.35rem; font-weight: 700; letter-spacing: 0.05em; margin: 0 0 4px 0; }
.rpt-subtitle { font-size: 0.78rem; margin: 0; opacity: 0.55; }
.rpt-info-box { border-radius: 6px; padding: 12px; margin-bottom: 16px; border: 1px solid; }
.rpt-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.rpt-td-label { font-weight: 700; padding: 5px 8px; width: 18%; opacity: 0.65; }
.rpt-td-value { padding: 5px 8px; }
.rpt-section { margin-bottom: 14px; }
.rpt-section-title { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding-left: 10px; margin: 0 0 7px 0; border-left: 3px solid; }
.rpt-body { font-size: 0.875rem; line-height: 1.75; margin: 0; }
.rpt-assessment-body h3 { font-size: 0.88rem; font-weight: 700; margin: 16px 0 5px 0; padding: 5px 10px 5px 12px; border-radius: 4px; border-left: 3px solid; display: block; }
.rpt-assessment-body p  { font-size: 0.875rem; line-height: 1.75; margin: 0 0 6px 0; }
.rpt-assessment-body ul, .rpt-assessment-body ol { font-size: 0.875rem; padding-left: 20px; margin: 4px 0 8px; }
.rpt-assessment-body li { margin-bottom: 4px; line-height: 1.65; }
.rpt-assessment-body strong { font-weight: 700; }
.rpt-footer { font-size: 0.72rem; text-align: center; margin-top: 24px; padding-top: 8px; border-top: 1px solid; opacity: 0.45; }

/* Dark */
#report-content .rpt-wrap { color: #CCC; }
#report-content .rpt-header { border-color: #2A2A2A; }
#report-content .rpt-title { color: #E8E8E8; }
#report-content .rpt-info-box { background: #0D1520; border-color: #1E3A5F; }
#report-content .rpt-table td { border-color: #1A2A3A; }
#report-content .rpt-td-label { color: #6B8FAF; }
#report-content .rpt-td-value { color: #CCC; }
#report-content .rpt-section-title--blue  { color: #60A5FA; border-color: #3b82f6; }
#report-content .rpt-section-title--green { color: #34D399; border-color: #10b981; }
#report-content .rpt-body { color: #BBB; }
#report-content .rpt-footer { border-color: #2A2A2A; color: #555; }
#report-content .rpt-assessment-body { color: #BBB; }
#report-content .rpt-assessment-body p { color: #BBB; }
#report-content .rpt-assessment-body li { color: #BBB; }
#report-content .rpt-assessment-body strong { color: #E8E8E8; }
#report-content .rpt-assessment-body h3[data-section="Differential Diagnosis"]     { color: #60A5FA; background: #0A1828; border-color: #3b82f6; }
#report-content .rpt-assessment-body h3[data-section="Most Likely Diagnosis"]      { color: #34D399; background: #051A10; border-color: #10b981; }
#report-content .rpt-assessment-body h3[data-section="Recommended Investigations"] { color: #FBBF24; background: #1A1200; border-color: #f59e0b; }
#report-content .rpt-assessment-body h3[data-section="Treatment Plan"]             { color: #F472B6; background: #1A0510; border-color: #ec4899; }
#report-content .rpt-assessment-body h3[data-section="Follow-up Recommendations"]  { color: #A78BFA; background: #0F0A1A; border-color: #8b5cf6; }
#report-content .rpt-assessment-body h3[data-section="Red Flags"]                  { color: #F87171; background: #1A0505; border-color: #ef4444; }

/* Light (PDF) */
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-header { border-color: #1a3a5c; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-title  { color: #1a3a5c; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-info-box { background: #eff6ff; border-color: #bfdbfe; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-table td { border-color: #d1d5db; background: #fff; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-table tr:nth-child(even) td { background: #f9fafb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-td-label { color: #4b5563; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-td-value { color: #111827; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-section-title--blue  { color: #1d4ed8; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-section-title--green { color: #065f46; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-body { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-footer { border-color: #e5e7eb; color: #9ca3af; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body p  { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body li { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body strong { color: #111827; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Differential Diagnosis"]     { color: #1d4ed8; background: #eff6ff; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Most Likely Diagnosis"]      { color: #065f46; background: #ecfdf5; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Recommended Investigations"] { color: #92400e; background: #fffbeb; border-color: #f59e0b; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Treatment Plan"]             { color: #9d174d; background: #fdf2f8; border-color: #ec4899; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Follow-up Recommendations"]  { color: #4c1d95; background: #f5f3ff; border-color: #8b5cf6; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Red Flags"]                  { color: #991b1b; background: #fef2f2; border-color: #ef4444; }
</style>`

      } catch (err) {
        console.error('Healthcare report error:', err)
        const date = new Date().toLocaleDateString('en-IN')
        finalReport = `<div class="rpt-wrap">
  <div class="rpt-header"><h1 class="rpt-title">MEDICAL CONSULTATION REPORT</h1></div>
  <p class="rpt-body"><strong>Patient:</strong> ${personName || 'Unknown'} &nbsp;|&nbsp; <strong>Date:</strong> ${date}</p>
  <p class="rpt-body" style="white-space:pre-wrap;">${transcript}</p>
</div>`
      }

    } else {
      // Finance domain
      try {
        const finLangName = language === 'KANNADA' ? 'Kannada (ಕನ್ನಡ)' : language === 'HINDI' ? 'Hindi (हिंदी)' : 'English'
        const financePrompt = `You are a senior financial advisor.
${language !== 'ENGLISH' ? `CRITICAL: Write ALL string values in ${finLangName}. Every text field below MUST be in ${finLangName}. Numbers and financial terms can stay in English.` : ''}

CRITICAL RULES:
- Do NOT provide your own opinions, feedback, or speculative financial advice beyond what was discussed.
- Only extract and structure information that was EXPLICITLY mentioned in the conversation.
- Never add recommendations or strategies that were NOT discussed by the financial advisor.
- Do NOT inject your own financial commentary or opinions.

Analyze this financial consultation thoroughly. Only extract what was EXPLICITLY mentioned. Be detailed and specific.

Conversation:
${transcript}

${nerEntities ? `Extracted entities:\n${JSON.stringify(nerEntities, null, 2)}` : ''}

Return JSON only:
{
  "clientGoals": ["list each financial goal discussed in detail${language !== 'ENGLISH' ? ` — write in ${finLangName}` : ''}"],
  "currentIncome": "monthly/annual income if mentioned, else null",
  "monthlyExpenses": "total or breakdown if mentioned, else null",
  "savingsRate": "percentage or amount if mentioned, else null",
  "riskProfile": "conservative/moderate/aggressive — infer from discussion",
  "taxSituation": "current tax bracket, filings, deductions mentioned${language !== 'ENGLISH' ? ` — write in ${finLangName}` : ''}, else null",
  "liabilities": [{"type":"loan/debt type","amount":"if mentioned","rate":"interest rate if mentioned","tenure":"if mentioned"}],
  "existingInvestments": [{"type":"MF/FD/stocks/etc","details":"specifics mentioned"}],
  "recommendations": [{"title":"short title${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}","detail":"detailed recommendation${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}","priority":"high/medium/low","timeline":"when to act"}],
  "taxOptimization": [{"strategy":"strategy name","detail":"how to implement${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}","potentialSaving":"estimated saving if possible"}],
  "riskAssessment": {"overallRisk":"low/medium/high","factors":["risk factors${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}"],"mitigations":["mitigations${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}"]},
  "incomeExpenseBreakdown": {"income":[{"source":"source","amount":"amount"}],"expenses":[{"category":"category","amount":"amount"}]},
  "insuranceReview": "insurance coverage mentioned or gaps${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}, null if not discussed",
  "emergencyFund": "status of emergency fund${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}, null if not discussed",
  "actionItems": [{"action":"specific action${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}","deadline":"timeline","priority":"high/medium/low"}],
  "summary": "2-3 sentence executive summary${language !== 'ENGLISH' ? ` in ${finLangName}` : ''}"
}`

        const financeResponse = await groqWithFallback({
          messages: [{ role: 'user', content: financePrompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: 3000
        }, true)

        let fd: any = {}
        try { fd = JSON.parse(financeResponse.choices[0].message.content!) }
        catch { fd = { clientGoals: [], recommendations: [{ title: 'Review needed', detail: 'Please review manually', priority: 'high', timeline: 'Immediate' }] } }

        const finTargetLangName = language === 'KANNADA' ? 'Kannada (ಕನ್ನಡ)' : language === 'HINDI' ? 'Hindi (हिंदी)' : 'English'
        const analysisPrompt = `You are a senior financial advisor.
Based on this consultation, write a detailed financial analysis.

CRITICAL RULES:
- Do NOT provide your own opinions or speculative advice beyond what was discussed.
- Only summarize and structure information EXPLICITLY mentioned in the conversation.
- Never add strategies or recommendations that were NOT discussed by the advisor.

Conversation:
${transcript}

Extracted data:
${JSON.stringify(fd, null, 2)}

Write clean HTML only. No markdown. No backticks.
Use these EXACT ENGLISH section names in <h3> tags (DO NOT translate these heading names):
- Financial Health Assessment
- Investment Strategy
- Risk Analysis
- Tax Planning Strategy
- Debt Management Plan
- Retirement & Long-term Planning

Format each section as:
<h3>Section Name In English</h3>
<p>detailed analysis here</p>
<ul><li>specific point here</li></ul>

${language !== 'ENGLISH' ? `ABSOLUTE REQUIREMENT — LANGUAGE:
The <h3> section headings MUST remain in English exactly as listed above.
But ALL other text — every <p> paragraph, every <li> list item, every explanation — MUST be written in ${finTargetLangName}.
Do NOT write English in <p> or <li> tags. Only ${finTargetLangName} is allowed there.
Financial terms may stay in English but wrap them in a ${finTargetLangName} sentence.` : ''}

Be thorough and specific. Reference actual numbers discussed. Provide actionable insights.`

        const analysisResponse = await groqWithFallback({
          messages: [{ role: 'user', content: analysisPrompt }],
          temperature: 0.4,
          max_tokens: 2500
        }, true)

        let analysisHtml = analysisResponse.choices[0].message.content!
          .replace(/```html/gi, '').replace(/```/g, '').trim()

        const FIN_ANALYSIS_SECTIONS: Record<string, { dark: string; bg: string; border: string }> = {
          'Financial Health Assessment':      { dark: '#34D399', bg: '#051A10', border: '#10b981' },
          'Investment Strategy':              { dark: '#60A5FA', bg: '#0A1828', border: '#3b82f6' },
          'Risk Analysis':                    { dark: '#F87171', bg: '#1A0505', border: '#ef4444' },
          'Tax Planning Strategy':            { dark: '#FBBF24', bg: '#1A1200', border: '#f59e0b' },
          'Debt Management Plan':             { dark: '#F472B6', bg: '#1A0510', border: '#ec4899' },
          'Retirement & Long-term Planning':  { dark: '#A78BFA', bg: '#0F0A1A', border: '#8b5cf6' },
        }

        Object.entries(FIN_ANALYSIS_SECTIONS).forEach(([name, colors]) => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`<h3>\\s*${escaped}\\s*</h3>`, 'gi')
          const displayName = (language !== 'ENGLISH' && FIN_SECTION_TRANSLATIONS[name]?.[language]) || name
          analysisHtml = analysisHtml.replace(regex, `<h3 data-finsection="${name}">${displayName}</h3>`)
        })

        const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        const deptName = department.replace(/_/g, ' ')

        const reportTitle     = language === 'KANNADA' ? 'ಆರ್ಥಿಕ ಸಮಾಲೋಚನಾ ವರದಿ'       : language === 'HINDI' ? 'वित्तीय परामर्श रिपोर्ट'         : 'FINANCIAL CONSULTATION REPORT'
        const labelClient     = language === 'KANNADA' ? 'ಗ್ರಾಹಕರ ಮಾಹಿತಿ'               : language === 'HINDI' ? 'ग्राहक जानकारी'                   : 'Client Information'
        const labelName       = language === 'KANNADA' ? 'ಹೆಸರು'                        : language === 'HINDI' ? 'नाम'                              : 'Name'
        const labelDate       = language === 'KANNADA' ? 'ದಿನಾಂಕ'                       : language === 'HINDI' ? 'तारीख'                            : 'Date'
        const labelDept       = language === 'KANNADA' ? 'ವಿಭಾಗ'                        : language === 'HINDI' ? 'विभाग'                            : 'Department'
        const labelRisk       = language === 'KANNADA' ? 'ರಿಸ್ಕ್ ಪ್ರೊಫೈಲ್'              : language === 'HINDI' ? 'जोखिम प्रोफाइल'                   : 'Risk Profile'
        const labelIncome     = language === 'KANNADA' ? 'ಆದಾಯ'                         : language === 'HINDI' ? 'आय'                               : 'Income'
        const labelExpenses   = language === 'KANNADA' ? 'ವೆಚ್ಚಗಳು'                    : language === 'HINDI' ? 'खर्च'                             : 'Expenses'
        const labelSavings    = language === 'KANNADA' ? 'ಉಳಿತಾಯ ದರ'                   : language === 'HINDI' ? 'बचत दर'                           : 'Savings Rate'
        const labelEmergency  = language === 'KANNADA' ? 'ತುರ್ತು ನಿಧಿ'                 : language === 'HINDI' ? 'आपातकालीन निधि'                   : 'Emergency Fund'
        const labelTax        = language === 'KANNADA' ? 'ತೆರಿಗೆ ಪರಿಸ್ಥಿತಿ'            : language === 'HINDI' ? 'कर स्थिति'                        : 'Tax Situation'
        const labelInsurance  = language === 'KANNADA' ? 'ವಿಮೆ'                         : language === 'HINDI' ? 'बीमा'                             : 'Insurance'
        const labelSummary    = language === 'KANNADA' ? 'ಕಾರ್ಯನಿರ್ವಾಹಕ ಸಾರಾಂಶ'        : language === 'HINDI' ? 'कार्यकारी सारांश'                 : 'Executive Summary'
        const labelGoals      = language === 'KANNADA' ? 'ಆರ್ಥಿಕ ಗುರಿಗಳು'              : language === 'HINDI' ? 'वित्तीय लक्ष्य'                   : 'Financial Goals'
        const labelLiabilities= language === 'KANNADA' ? 'ಬಾಕಿ ಹೊಣೆಗಾರಿಕೆಗಳು'         : language === 'HINDI' ? 'बकाया देनदारियां'                 : 'Outstanding Liabilities'
        const labelRecs       = language === 'KANNADA' ? 'ಶಿಫಾರಸುಗಳು'                  : language === 'HINDI' ? 'सिफारिशें'                        : 'Recommendations'
        const labelRiskAssess = language === 'KANNADA' ? 'ರಿಸ್ಕ್ ಮೌಲ್ಯಮಾಪನ'            : language === 'HINDI' ? 'जोखिम मूल्यांकन'                  : 'Risk Assessment'
        const labelTaxOpt     = language === 'KANNADA' ? 'ತೆರಿಗೆ ಆಪ್ಟಿಮೈಸೇಶನ್'         : language === 'HINDI' ? 'कर अनुकूलन रणनीतियाँ'            : 'Tax Optimization Strategies'
        const labelActions    = language === 'KANNADA' ? 'ಕ್ರಿಯಾ ಐಟಂಗಳು'               : language === 'HINDI' ? 'कार्य आइटम'                       : 'Action Items'
        const labelAnalysis   = language === 'KANNADA' ? 'ವಿವರವಾದ ಆರ್ಥಿಕ ವಿಶ್ಲೇಷಣೆ'   : language === 'HINDI' ? 'विस्तृत वित्तीय विश्लेषण'        : 'Detailed Financial Analysis'
        const labelConfidential = language === 'KANNADA' ? 'ಗೌಪ್ಯ'                     : language === 'HINDI' ? 'गोपनीय'                           : 'Confidential'
        const labelGenerated  = language === 'KANNADA' ? 'ವಾಯ್ಸ್ ಇಂಟೆಲಿಜೆನ್ಸ್ ಸಿಸ್ಟಮ್ ಮೂಲಕ ರಚಿಸಲಾಗಿದೆ' : language === 'HINDI' ? 'वॉयस इंटेलिजेंस सिस्टम द्वारा उत्पन्न' : 'Generated by Voice Intelligence System'
        const labelType       = language === 'KANNADA' ? 'ಪ್ರಕಾರ'  : language === 'HINDI' ? 'प्रकार'   : 'Type'
        const labelAmount     = language === 'KANNADA' ? 'ಮೊತ್ತ'   : language === 'HINDI' ? 'राशि'     : 'Amount'
        const labelRate       = language === 'KANNADA' ? 'ದರ'       : language === 'HINDI' ? 'दर'       : 'Rate'
        const labelTenure     = language === 'KANNADA' ? 'ಅವಧಿ'     : language === 'HINDI' ? 'अवधि'     : 'Tenure'
        const labelOverallRisk= language === 'KANNADA' ? 'ಒಟ್ಟಾರೆ ರಿಸ್ಕ್ ಮಟ್ಟ' : language === 'HINDI' ? 'समग्र जोखिम स्तर' : 'Overall Risk Level'
        const labelRiskFactors= language === 'KANNADA' ? 'ರಿಸ್ಕ್ ಅಂಶಗಳು'      : language === 'HINDI' ? 'जोखिम कारक'        : 'Risk Factors'
        const labelMitigations= language === 'KANNADA' ? 'ತಗ್ಗಿಸುವ ಕ್ರಮಗಳು'   : language === 'HINDI' ? 'शमन उपाय'          : 'Mitigations'

        const liabilitiesHtml = fd.liabilities?.length > 0 ? `
<div class="rpt-section">
  <h2 class="rpt-fin-heading" data-fin="liabilities">${labelLiabilities}</h2>
  <table class="rpt-table">
    <tr>
      <td class="rpt-td-label">${labelType}</td>
      <td class="rpt-td-label">${labelAmount}</td>
      <td class="rpt-td-label">${labelRate}</td>
      <td class="rpt-td-label">${labelTenure}</td>
    </tr>
    ${fd.liabilities.map((l: any) => `<tr>
      <td class="rpt-td-value">${l.type || '-'}</td>
      <td class="rpt-td-value">${l.amount || '-'}</td>
      <td class="rpt-td-value">${l.rate || '-'}</td>
      <td class="rpt-td-value">${l.tenure || '-'}</td>
    </tr>`).join('')}
  </table>
</div>` : ''

        const recsHtml = fd.recommendations?.length > 0 ? fd.recommendations.map((r: any) => `
<div style="padding:10px 14px;border-radius:8px;margin-bottom:8px;border-left:3px solid ${r.priority === 'high' ? '#ef4444' : r.priority === 'medium' ? '#f59e0b' : '#34D399'};">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
    <strong>${r.title || 'Recommendation'}</strong>
    <span style="font-size:10px;padding:1px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:0.05em;
      background:${r.priority === 'high' ? '#1A050522' : r.priority === 'medium' ? '#1A120022' : '#051A1022'};
      color:${r.priority === 'high' ? '#F87171' : r.priority === 'medium' ? '#FBBF24' : '#34D399'};">${r.priority || 'medium'}</span>
    ${r.timeline ? `<span style="font-size:10px;color:#666;">⏱ ${r.timeline}</span>` : ''}
  </div>
  <p class="rpt-body">${r.detail || ''}</p>
</div>`).join('') : '<p class="rpt-body">No specific recommendations at this time.</p>'

        const actionsHtml = fd.actionItems?.length > 0
          ? fd.actionItems.map((a: any) => `<li class="rpt-body"><strong>${a.action}</strong>${a.deadline ? ` — <em>by ${a.deadline}</em>` : ''}${a.priority ? ` [${a.priority}]` : ''}</li>`).join('')
          : '<li class="rpt-body">No immediate actions identified</li>'

        const taxHtml = fd.taxOptimization?.length > 0
          ? fd.taxOptimization.map((t: any) => `<li class="rpt-body"><strong>${t.strategy}</strong>: ${t.detail || ''}${t.potentialSaving ? ` — ${t.potentialSaving}` : ''}</li>`).join('')
          : '<li class="rpt-body">No tax optimization strategies discussed</li>'

        finalReport = `
<div class="rpt-wrap">
  <div class="rpt-header">
    <h1 class="rpt-title">${reportTitle}</h1>
    <p class="rpt-subtitle">${labelConfidential} &nbsp;•&nbsp; ${deptName}</p>
  </div>

  <div class="rpt-info-box">
    <h2 class="rpt-section-title rpt-section-title--green">${labelClient}</h2>
    <table class="rpt-table">
      <tr>
        <td class="rpt-td-label">${labelName}</td>
        <td class="rpt-td-value">${personName || 'Valued Client'}</td>
        <td class="rpt-td-label">${labelDate}</td>
        <td class="rpt-td-value">${date}</td>
      </tr>
      <tr>
        <td class="rpt-td-label">${labelDept}</td>
        <td class="rpt-td-value">${deptName}</td>
        <td class="rpt-td-label">${labelRisk}</td>
        <td class="rpt-td-value" style="text-transform:capitalize;">${fd.riskProfile || 'To be assessed'}</td>
      </tr>
      ${fd.currentIncome ? `<tr>
        <td class="rpt-td-label">${labelIncome}</td>
        <td class="rpt-td-value">${fd.currentIncome}</td>
        <td class="rpt-td-label">${labelExpenses}</td>
        <td class="rpt-td-value">${fd.monthlyExpenses || 'Not specified'}</td>
      </tr>` : ''}
      ${fd.savingsRate ? `<tr>
        <td class="rpt-td-label">${labelSavings}</td>
        <td class="rpt-td-value">${fd.savingsRate}</td>
        <td class="rpt-td-label">${labelEmergency}</td>
        <td class="rpt-td-value">${fd.emergencyFund || 'Not discussed'}</td>
      </tr>` : ''}
      ${fd.taxSituation ? `<tr>
        <td class="rpt-td-label">${labelTax}</td>
        <td class="rpt-td-value" colspan="3">${fd.taxSituation}</td>
      </tr>` : ''}
      ${fd.insuranceReview ? `<tr>
        <td class="rpt-td-label">${labelInsurance}</td>
        <td class="rpt-td-value" colspan="3">${fd.insuranceReview}</td>
      </tr>` : ''}
    </table>
  </div>

  ${fd.summary ? `<div class="rpt-section">
    <h2 class="rpt-section-title rpt-section-title--green">${labelSummary}</h2>
    <p class="rpt-body">${fd.summary}</p>
  </div>` : ''}

  <div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="clientGoals">${labelGoals}</h2>
    <ul>${(fd.clientGoals?.length ? fd.clientGoals : ['Not specified']).map((g: string) => `<li class="rpt-body">${g}</li>`).join('')}</ul>
  </div>

  ${liabilitiesHtml}

  <div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="recommendations">${labelRecs}</h2>
    ${recsHtml}
  </div>

  ${fd.riskAssessment ? `<div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="riskAssessment">${labelRiskAssess}</h2>
    <p class="rpt-body"><strong>${labelOverallRisk}:</strong> ${fd.riskAssessment.overallRisk || 'Not assessed'}</p>
    ${fd.riskAssessment.factors?.length ? `<p class="rpt-body" style="margin-top:6px;"><strong>${labelRiskFactors}:</strong></p><ul>${fd.riskAssessment.factors.map((f: string) => `<li class="rpt-body">${f}</li>`).join('')}</ul>` : ''}
    ${fd.riskAssessment.mitigations?.length ? `<p class="rpt-body" style="margin-top:6px;"><strong>${labelMitigations}:</strong></p><ul>${fd.riskAssessment.mitigations.map((m: string) => `<li class="rpt-body">${m}</li>`).join('')}</ul>` : ''}
  </div>` : ''}

  <div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="taxOptimization">${labelTaxOpt}</h2>
    <ul>${taxHtml}</ul>
  </div>

  <div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="actionItems">${labelActions}</h2>
    <ol>${actionsHtml}</ol>
  </div>

  <div class="rpt-section rpt-assessment">
    <h2 class="rpt-section-title rpt-section-title--green">${labelAnalysis}</h2>
    <div class="rpt-assessment-body">${analysisHtml}</div>
  </div>

  <div class="rpt-footer">
    ${labelGenerated} &nbsp;|&nbsp; ${date}
  </div>
</div>

<style>
.rpt-wrap { font-family: Georgia, 'Times New Roman', serif; max-width: 780px; }
.rpt-header { text-align: center; border-bottom: 2px solid; padding-bottom: 12px; margin-bottom: 20px; }
.rpt-title { font-size: 1.35rem; font-weight: 700; letter-spacing: 0.05em; margin: 0 0 4px 0; }
.rpt-subtitle { font-size: 0.78rem; margin: 0; opacity: 0.55; }
.rpt-info-box { border-radius: 6px; padding: 12px; margin-bottom: 16px; border: 1px solid; }
.rpt-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.rpt-td-label { font-weight: 700; padding: 5px 8px; width: 18%; opacity: 0.65; }
.rpt-td-value { padding: 5px 8px; }
.rpt-section { margin-bottom: 14px; }
.rpt-section-title { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding-left: 10px; margin: 0 0 7px 0; border-left: 3px solid; }
.rpt-fin-heading { font-size: 0.88rem; font-weight: 700; margin: 14px 0 6px 0; padding: 5px 10px 5px 12px; border-radius: 4px; border-left: 3px solid; }
.rpt-body { font-size: 0.875rem; line-height: 1.75; margin: 0; }
ul, ol { padding-left: 20px; margin: 4px 0 8px; }
li { margin-bottom: 4px; line-height: 1.65; }
.rpt-footer { font-size: 0.72rem; text-align: center; margin-top: 24px; padding-top: 8px; border-top: 1px solid; opacity: 0.45; }
.rpt-assessment-body h3 { font-size: 0.88rem; font-weight: 700; margin: 16px 0 5px 0; padding: 5px 10px 5px 12px; border-radius: 4px; border-left: 3px solid; display: block; }
.rpt-assessment-body p { font-size: 0.875rem; line-height: 1.75; margin: 0 0 6px 0; }
.rpt-assessment-body ul, .rpt-assessment-body ol { font-size: 0.875rem; padding-left: 20px; margin: 4px 0 8px; }
.rpt-assessment-body li { margin-bottom: 4px; line-height: 1.65; }
.rpt-assessment-body strong { font-weight: 700; }

/* Dark */
#report-content .rpt-wrap { color: #CCC; }
#report-content .rpt-header { border-color: #2A2A2A; }
#report-content .rpt-title { color: #E8E8E8; }
#report-content .rpt-info-box { background: #0A1D14; border-color: #065f46; }
#report-content .rpt-table td { border-color: #1A2E22; }
#report-content .rpt-td-label { color: #6BAF8F; }
#report-content .rpt-td-value { color: #CCC; }
#report-content .rpt-section-title--green { color: #34D399; border-color: #10b981; }
#report-content .rpt-section-title--blue  { color: #60A5FA; border-color: #3b82f6; }
#report-content .rpt-body { color: #BBB; }
#report-content li { color: #BBB; }
#report-content .rpt-footer { border-color: #2A2A2A; color: #555; }
#report-content [data-fin="clientGoals"]     { color: #34D399; background: #051A10; border-color: #10b981; }
#report-content [data-fin="recommendations"] { color: #60A5FA; background: #0A1828; border-color: #3b82f6; }
#report-content [data-fin="taxOptimization"] { color: #FBBF24; background: #1A1200; border-color: #f59e0b; }
#report-content [data-fin="actionItems"]     { color: #A78BFA; background: #0F0A1A; border-color: #8b5cf6; }
#report-content [data-fin="liabilities"]     { color: #F472B6; background: #1A0510; border-color: #ec4899; }
#report-content [data-fin="riskAssessment"]  { color: #F87171; background: #1A0505; border-color: #ef4444; }
#report-content .rpt-assessment-body { color: #BBB; }
#report-content .rpt-assessment-body p { color: #BBB; }
#report-content .rpt-assessment-body li { color: #BBB; }
#report-content .rpt-assessment-body strong { color: #E8E8E8; }
#report-content .rpt-assessment-body h3[data-finsection="Financial Health Assessment"] { color: #34D399; background: #051A10; border-color: #10b981; }
#report-content .rpt-assessment-body h3[data-finsection="Investment Strategy"]         { color: #60A5FA; background: #0A1828; border-color: #3b82f6; }
#report-content .rpt-assessment-body h3[data-finsection="Risk Analysis"]               { color: #F87171; background: #1A0505; border-color: #ef4444; }
#report-content .rpt-assessment-body h3[data-finsection="Tax Planning Strategy"]       { color: #FBBF24; background: #1A1200; border-color: #f59e0b; }
#report-content .rpt-assessment-body h3[data-finsection="Debt Management Plan"]        { color: #F472B6; background: #1A0510; border-color: #ec4899; }
#report-content .rpt-assessment-body h3[data-finsection="Retirement & Long-term Planning"] { color: #A78BFA; background: #0F0A1A; border-color: #8b5cf6; }
#report-content .rpt-assessment-body h3[data-section="Differential Diagnosis"]     { color: #60A5FA; background: #0A1828; border-color: #3b82f6; }
#report-content .rpt-assessment-body h3[data-section="Most Likely Diagnosis"]      { color: #34D399; background: #051A10; border-color: #10b981; }
#report-content .rpt-assessment-body h3[data-section="Recommended Investigations"] { color: #FBBF24; background: #1A1200; border-color: #f59e0b; }
#report-content .rpt-assessment-body h3[data-section="Treatment Plan"]             { color: #F472B6; background: #1A0510; border-color: #ec4899; }
#report-content .rpt-assessment-body h3[data-section="Follow-up Recommendations"]  { color: #A78BFA; background: #0F0A1A; border-color: #8b5cf6; }
#report-content .rpt-assessment-body h3[data-section="Red Flags"]                  { color: #F87171; background: #1A0505; border-color: #ef4444; }

/* Light (PDF) */
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-header { border-color: #065f46; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-title  { color: #065f46; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-info-box { background: #ecfdf5; border-color: #a7f3d0; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-table td { border-color: #d1d5db; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-td-label { color: #4b5563; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-td-value { color: #111827; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-section-title--green { color: #065f46; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-section-title--blue  { color: #1d4ed8; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-body { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) li { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-footer { border-color: #e5e7eb; color: #9ca3af; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="clientGoals"]     { color: #065f46; background: #ecfdf5; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="recommendations"] { color: #1d4ed8; background: #eff6ff; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="taxOptimization"] { color: #92400e; background: #fffbeb; border-color: #f59e0b; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="actionItems"]     { color: #4c1d95; background: #f5f3ff; border-color: #8b5cf6; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="liabilities"]     { color: #9d174d; background: #fdf2f8; border-color: #ec4899; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="riskAssessment"]  { color: #991b1b; background: #fef2f2; border-color: #ef4444; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body p  { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body li { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body strong { color: #111827; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Financial Health Assessment"] { color: #065f46; background: #ecfdf5; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Investment Strategy"]         { color: #1d4ed8; background: #eff6ff; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Risk Analysis"]               { color: #991b1b; background: #fef2f2; border-color: #ef4444; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Tax Planning Strategy"]       { color: #92400e; background: #fffbeb; border-color: #f59e0b; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Debt Management Plan"]        { color: #9d174d; background: #fdf2f8; border-color: #ec4899; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Retirement & Long-term Planning"] { color: #4c1d95; background: #f5f3ff; border-color: #8b5cf6; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Differential Diagnosis"]     { color: #1d4ed8; background: #eff6ff; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Most Likely Diagnosis"]      { color: #065f46; background: #ecfdf5; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Recommended Investigations"] { color: #92400e; background: #fffbeb; border-color: #f59e0b; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Treatment Plan"]             { color: #9d174d; background: #fdf2f8; border-color: #ec4899; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Follow-up Recommendations"]  { color: #4c1d95; background: #f5f3ff; border-color: #8b5cf6; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Red Flags"]                  { color: #991b1b; background: #fef2f2; border-color: #ef4444; }
</style>`

      } catch (err) {
        console.error('Finance report error:', err)
        finalReport = `<div class="rpt-wrap"><h1 class="rpt-title">FINANCIAL CONSULTATION REPORT</h1><p class="rpt-body">${transcript}</p></div>`
      }
    }

    // Hash patient PII in the final report for cybersecurity
    const hashedReport = hashPII(finalReport, {
      name: personName,
      phone: personPhone,
      email: personEmail,
    })

    return NextResponse.json({ report: hashedReport })

  } catch (error: any) {
    console.error('Report generation failed:', error)
    return NextResponse.json({ error: 'Report generation failed', details: error.message }, { status: 500 })
  }
}