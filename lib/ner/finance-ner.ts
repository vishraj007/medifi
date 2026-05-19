// lib/ner/finance-ner.ts

import { groq, MODELS } from '@/lib/groq'

export interface FinanceEntities {
  income: string[]
  expenses: string[]
  investments: string[]
  taxes: string[]
  loans: string[]
  insurance: string[]
  goals: string[]
  amounts: string[]
  timeframes: string[]
  taxSections: string[]
}

export async function extractFinanceEntities(text: string): Promise<FinanceEntities> {
  const prompt = `You are a financial Named Entity Recognition (NER) system.

CRITICAL RULES:
- Extract ONLY entities that are POSITIVELY mentioned
- If something is denied or negated ("no investments", "don't have insurance"), do NOT include it
- Extract exact terms/values mentioned, not inferred ones
- Keep amounts with their units (e.g., "5 lakhs", "₹50,000", "15%")

**Conversation to analyze:**
${text}

**Extract ONLY positively confirmed entities:**

1. INCOME - Income sources mentioned (e.g., "salary", "freelance income", "rental income", "₹8 lakhs per year")
2. EXPENSES - Expenses mentioned (e.g., "rent 15000", "monthly EMI", "school fees")
3. INVESTMENTS - Investment types mentioned (e.g., "PPF", "mutual funds", "FD", "stocks", "NPS")
4. TAXES - Tax-related mentions (e.g., "income tax", "GST", "TDS", "tax regime", "ITR filing")
5. LOANS - Loans/debts mentioned (e.g., "home loan", "car loan", "personal loan", "EMI")
6. INSURANCE - Insurance mentioned (e.g., "life insurance", "health insurance", "term plan")
7. GOALS - Financial goals mentioned (e.g., "buy house", "retirement", "child education", "emergency fund")
8. AMOUNTS - Specific amounts mentioned (e.g., "₹50,000", "5 lakhs", "20%", "₹1.5 lakh limit")
9. TIMEFRAMES - Time references (e.g., "this financial year", "next 5 years", "by 2030", "monthly")
10. TAX_SECTIONS - Tax sections/deductions mentioned (e.g., "80C", "80D", "HRA", "Section 24", "10(14)")

**Negation patterns to EXCLUDE:** "no X", "don't have X", "not investing in X", "haven't filed X", "no plans for X"

Return ONLY valid JSON:
{
  "income": [],
  "expenses": [],
  "investments": [],
  "taxes": [],
  "loans": [],
  "insurance": [],
  "goals": [],
  "amounts": [],
  "timeframes": [],
  "taxSections": []
}`

  try {
    const response = await groq.chat.completions.create({
      model: MODELS.SMART,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 1000
    })

    const entities = JSON.parse(response.choices[0].message.content!)
    return entities as FinanceEntities
  } catch (error) {
    console.error('Finance NER extraction failed:', error)
    return {
      income: [], expenses: [], investments: [], taxes: [],
      loans: [], insurance: [], goals: [], amounts: [],
      timeframes: [], taxSections: []
    }
  }
}