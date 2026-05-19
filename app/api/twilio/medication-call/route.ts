// app/api/twilio/medication-call/route.ts
// Fires an IMMEDIATE Twilio call for a medication reminder (manual "Call Now" from session page).
// This route already existed in your project — ensure it contains this updated version.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/jwt'
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!)
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER!

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    verifyToken(token)

    const { sessionId, medication, slot } = await req.json()
    // slot: 'morning' | 'afternoon' | 'night' — optional, defaults to 'dose'

    if (!sessionId || !medication) {
      return NextResponse.json({ error: 'sessionId and medication are required' }, { status: 400 })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { person: true, user: { select: { name: true } } },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const phone = session.person.phone
    if (!phone) return NextResponse.json({ error: 'Patient has no phone number' }, { status: 400 })

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    const patientName = session.person.name || 'valued patient'
    const doctorName  = session.user?.name  || 'your doctor'

    const slotPhrases: Record<string, string> = {
      morning: 'your morning', afternoon: 'your afternoon', night: 'your evening',
    }
    const slotLabel  = slotPhrases[slot] ?? 'your'
    const dosageText = medication.dosage ? ` Your dose is ${medication.dosage}.` : ''
    const notesText  = medication.notes  ? ` Instructions: ${medication.notes}.`  : ''

    const message = medication.customMessage?.trim()
      || `Hello ${patientName}. This is an immediate medication reminder from Voice Intelligence. `
        + `It is time for ${slotLabel} dose of ${medication.name}.`
        + dosageText
        + notesText
        + ` Please take your medication now. If you have any concerns, please contact ${doctorName}. Thank you.`

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">${message}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">Take care. Goodbye.</Say>
</Response>`

    const call = await client.calls.create({ twiml, to: formattedPhone, from: TWILIO_FROM })

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      callStatus: call.status,
      message: `Medication reminder call initiated to ${formattedPhone}`,
    })
  } catch (error: any) {
    console.error('Medication call error:', error)
    return NextResponse.json({ error: error.message || 'Failed to make call' }, { status: 500 })
  }
} 