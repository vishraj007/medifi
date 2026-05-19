// lib/ner/medical-ner.ts

import { groq, MODELS } from '@/lib/groq'

export interface MedicalEntities {
  symptoms: string[]
  medications: string[]
  diseases: string[]
  procedures: string[]
  bodyParts: string[]
  severity: string[]
  duration: string[]
  frequency: string[]
}

export async function extractMedicalEntities(text: string): Promise<MedicalEntities> {
  const prompt = `You are a strict medical Named Entity Recognition (NER) system analyzing a full doctor-patient conversation.

CRITICAL RULES:
- Read the ENTIRE conversation and extract entities cumulatively across ALL messages
- Extract ONLY entities that are POSITIVELY confirmed anywhere in the conversation
- NEGATION is SPECIFIC: "no cough or sore throat" means only cough and sore throat are negated
  → "body ache" in the SAME sentence is NOT negated and MUST be extracted
- "the fever subsided after a while" → "after a while" is NOT a duration, skip it
- DURATION must be a real time reference: "three days", "since morning", "for a week", "yesterday"
- Do NOT include conversational phrases like "after a", "after a while", "a while" as duration
- Procedures mentioned by the DOCTOR as recommendations must be extracted (e.g. "CBC", "malaria test")
- Diseases or diagnoses stated by the doctor must be extracted (e.g. "viral infection")
- Do NOT hallucinate — only extract what is explicitly stated
- No partial duplicates — "three days" not "three" separately
- Each value must be a meaningful complete medical term or phrase

**Full conversation to analyze:**
${text}

**Extract cumulatively across the entire conversation:**
1. SYMPTOMS — positively confirmed symptoms from patient (exclude only the specifically negated ones)
2. MEDICATIONS — any drugs/medicines mentioned as taken or prescribed
3. DISEASES — diagnoses or conditions mentioned by doctor or patient
4. PROCEDURES — any test or procedure recommended or mentioned (CBC, blood test, X-ray, malaria test, urine routine, etc.)
5. BODY_PARTS — body parts mentioned in symptom context
6. SEVERITY — severity descriptors (mild, severe, high, slightly high, normal)
7. DURATION — real time references only ("three days", "yesterday", "since morning") — NO phrases like "after a", "after a while"
8. FREQUENCY — how often symptoms occur (daily, twice a day, constant, intermittent)

**Negation rule:** "no X or Y" → only X and Y are negated. Other entities in the same sentence are still valid.

Return ONLY valid JSON with no extra text:
{
  "symptoms": [],
  "medications": [],
  "diseases": [],
  "procedures": [],
  "bodyParts": [],
  "severity": [],
  "duration": [],
  "frequency": []
}`

  try {
    const response = await groq.chat.completions.create({
      model: MODELS.FAST,    // ← 8b instead of 70b, good enough for NER
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 500        // ← NER output is small, 500 is plenty
    })
    const entities = JSON.parse(response.choices[0].message.content!)
    return entities as MedicalEntities
  } catch (error) {
    console.error('NER extraction failed:', error)
    return {
      symptoms: [],
      medications: [],
      diseases: [],
      procedures: [],
      bodyParts: [],
      severity: [],
      duration: [],
      frequency: []
    }
  }
}