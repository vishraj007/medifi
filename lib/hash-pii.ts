// lib/hash-pii.ts
// Utility to hash/anonymize patient PII in reports for cybersecurity

import crypto from 'crypto'

/**
 * Hash a name: "John Doe" → "J***e (ID: a7c3f2)"
 */
export function hashName(name: string): string {
  if (!name || name.trim().length === 0) return 'Anonymous'
  const trimmed = name.trim()
  const hash = crypto.createHash('sha256').update(trimmed.toLowerCase()).digest('hex').slice(0, 6)
  if (trimmed.length <= 2) return `${trimmed[0]}*** (ID: ${hash})`
  return `${trimmed[0]}${'*'.repeat(Math.min(trimmed.length - 2, 5))}${trimmed[trimmed.length - 1]} (ID: ${hash})`
}

/**
 * Hash a phone: "9876543210" → "******3210"
 */
export function hashPhone(phone: string): string {
  if (!phone) return '****'
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return '****'
  const visible = digits.slice(-4)
  return `${'*'.repeat(digits.length - 4)}${visible}`
}

/**
 * Hash an email: "john@example.com" → "j***@***.com"
 */
export function hashEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***'
  const [local, domain] = email.split('@')
  const domainParts = domain.split('.')
  const ext = domainParts[domainParts.length - 1]
  const hashedLocal = local.length > 1 ? `${local[0]}${'*'.repeat(Math.min(local.length - 1, 4))}` : `${local}***`
  return `${hashedLocal}@***.${ext}`
}

/**
 * Replace all PII occurrences in text with hashed versions.
 * Searches for name, phone, email and replaces all instances.
 */
export function hashPII(
  text: string,
  personData: { name?: string | null; phone?: string | null; email?: string | null }
): string {
  if (!text) return text
  let result = text

  // Hash name (case-insensitive replacement)
  if (personData.name && personData.name.trim()) {
    const name = personData.name.trim()
    const hashed = hashName(name)
    // Replace full name
    result = result.replace(new RegExp(escapeRegExp(name), 'gi'), hashed)
    // Also replace first name only if multi-word
    const parts = name.split(/\s+/)
    if (parts.length > 1) {
      parts.forEach(part => {
        if (part.length > 2) {
          result = result.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, 'gi'), hashName(part))
        }
      })
    }
  }

  // Hash phone
  if (personData.phone && personData.phone.trim()) {
    const phone = personData.phone.trim()
    const hashed = hashPhone(phone)
    result = result.replace(new RegExp(escapeRegExp(phone), 'g'), hashed)
    // Also try with +91 prefix
    result = result.replace(new RegExp(escapeRegExp(`+91${phone}`), 'g'), `+91${hashed}`)
  }

  // Hash email
  if (personData.email && personData.email.trim()) {
    const email = personData.email.trim()
    const hashed = hashEmail(email)
    result = result.replace(new RegExp(escapeRegExp(email), 'gi'), hashed)
  }

  return result
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
