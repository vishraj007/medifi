// lib/huggingface/ner.ts

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

export interface HuggingFaceEntity {
  entity_group: string
  score: number
  word: string
  start: number
  end: number
}

// Phrases that look like duration but are NOT real time references
const INVALID_DURATION_PHRASES = [
  'after a',
  'after a while',
  'a while',
  'while',
  'after',
  'later',
  'soon',
  'once',
]

function getNegatedSpans(text: string): Array<{ start: number; end: number }> {
  const negationPatterns = [
    /\bno\s+\w+/gi,
    /\bnot\s+\w+/gi,
    /\bwithout\s+\w+/gi,
    /\bdenies\s+\w+/gi,
    /\bno\s+history\s+of\s+\w+/gi,
    /\bnot\s+having\s+\w+/gi,
    /\bdoes\s+not\s+have\s+\w+/gi,
  ]
  const spans: Array<{ start: number; end: number }> = []
  for (const pattern of negationPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length + 30 })
    }
  }
  return spans
}

function isNegated(
  entity: HuggingFaceEntity,
  negatedSpans: Array<{ start: number; end: number }>
): boolean {
  return negatedSpans.some(
    span => entity.start >= span.start && entity.start <= span.end
  )
}

function mergeSubwordEntities(entities: HuggingFaceEntity[]): HuggingFaceEntity[] {
  if (entities.length === 0) return []

  const merged: HuggingFaceEntity[] = []
  let current = { ...entities[0] }

  for (let i = 1; i < entities.length; i++) {
    const next = entities[i]
    const isSubword = next.word.startsWith('##')
    const isAdjacent =
      next.entity_group === current.entity_group && next.start === current.end

    if (isSubword || isAdjacent) {
      current.word += next.word.startsWith('##') ? next.word.slice(2) : next.word
      current.end = next.end
      current.score = Math.max(current.score, next.score)
    } else {
      merged.push(current)
      current = { ...next }
    }
  }
  merged.push(current)
  return merged
}

export function hasSubwordFragments(entities: MedicalEntities): boolean {
  const allWords = Object.values(entities).flat()
  return allWords.some(
    word => word.startsWith('##') || (word.length <= 2 && /^[a-z]+$/i.test(word))
  )
}

function deduplicateSubstrings(arr: string[]): string[] {
  return arr.filter(
    word => !arr.some(other => other !== word && other.includes(word))
  )
}

function isValidDuration(word: string): boolean {
  const lower = word.toLowerCase().trim()
  // Must be rejected if it matches any invalid phrase
  if (INVALID_DURATION_PHRASES.includes(lower)) return false
  // Must contain a time word or number to be valid
  const timeWords = /\b(day|days|week|weeks|hour|hours|month|months|morning|night|yesterday|ago|since|for)\b/i
  const hasNumber = /\d/.test(word)
  const hasTimeWord = timeWords.test(word)
  return hasNumber || hasTimeWord
}

export async function extractMedicalEntitiesHF(text: string): Promise<MedicalEntities> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    console.error('Hugging Face API key not found')
    return getEmptyEntities()
  }

  const negatedSpans = getNegatedSpans(text)

  try {
    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/d4data/biomedical-ner-all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          parameters: { aggregation_strategy: 'simple' },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error(`Hugging Face API error (${response.status}):`, error)
      if (response.status === 503) {
        console.log('HF model is loading, retrying in 10s...')
        await new Promise(resolve => setTimeout(resolve, 10_000))
        return extractMedicalEntitiesHF(text)
      }
      return getEmptyEntities()
    }

    const raw = await response.json()

    let entities: HuggingFaceEntity[] = []
    if (Array.isArray(raw)) {
      entities = raw
    } else if (raw && typeof raw === 'object') {
      const candidate = Object.values(raw).find(v => Array.isArray(v))
      if (candidate) entities = candidate as HuggingFaceEntity[]
    }

    const positiveEntities = entities.filter(e => !isNegated(e, negatedSpans))
    const mergedEntities = mergeSubwordEntities(positiveEntities)
    const result = mapEntitiesToStructure(mergedEntities)

    // Deduplicate substrings
    for (const key of Object.keys(result) as Array<keyof MedicalEntities>) {
      result[key] = deduplicateSubstrings(result[key])
    }

    // Filter out invalid duration phrases
    result.duration = result.duration.filter(isValidDuration)

    return result

  } catch (error) {
    console.error('Hugging Face NER error:', error)
    return getEmptyEntities()
  }
}

function mapEntitiesToStructure(entities: HuggingFaceEntity[]): MedicalEntities {
  const result: MedicalEntities = getEmptyEntities()

  const mappings: Record<string, keyof MedicalEntities> = {
    'Sign_symptom':          'symptoms',
    'SYMPTOM':               'symptoms',
    'SIGN':                  'symptoms',
    'Medication':            'medications',
    'DRUG':                  'medications',
    'CHEMICAL':              'medications',
    'Drug':                  'medications',
    'Disease_disorder':      'diseases',
    'DISEASE':               'diseases',
    'CONDITION':             'diseases',
    'Diagnostic_procedure':  'procedures',
    'Therapeutic_procedure': 'procedures',
    'PROCEDURE':             'procedures',
    'TREATMENT':             'procedures',
    'Lab_value':             'procedures',
    'Biological_structure':  'bodyParts',
    'ANATOMY':               'bodyParts',
    'BODY_PART':             'bodyParts',
    'Severity':              'severity',
    'SEVERITY':              'severity',
    'Duration':              'duration',
    'DATE':                  'duration',
    'TIME':                  'duration',
    'Frequency':             'frequency',
    'FREQUENCY':             'frequency',
  }

  for (const entity of entities) {
    const category = mappings[entity.entity_group]
    if (category && entity.score > 0.5) {
      const word = entity.word.replace(/^##/, '').trim()
      if (word.length > 1 && !result[category].includes(word)) {
        result[category].push(word)
      }
    }
  }

  return result
}

function getEmptyEntities(): MedicalEntities {
  return {
    symptoms:    [],
    medications: [],
    diseases:    [],
    procedures:  [],
    bodyParts:   [],
    severity:    [],
    duration:    [],
    frequency:   [],
  }
}