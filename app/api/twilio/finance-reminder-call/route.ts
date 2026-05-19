// app/api/twilio/finance-reminder-call/route.ts
// Fires an immediate Twilio voice call for a finance/investment reminder.

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

    const { sessionId, reminder } = await req.json()
    if (!sessionId || !reminder) {
      return NextResponse.json({ error: 'sessionId and reminder required' }, { status: 400 })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { person: true, user: { select: { name: true } } }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const phone = session.person.phone
    if (!phone) return NextResponse.json({ error: 'Client has no phone number' }, { status: 400 })

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    const clientName  = session.person.name || 'valued client'
    const advisorName = session.user?.name || 'your financial advisor'

    const amountText = reminder.amount ? ` The recommended amount is ${reminder.amount}.` : ''
    const descText   = reminder.description ? ` ${reminder.description}.` : ''

    const script = reminder.customMessage?.trim()
      || `Hello ${clientName}. This is an investment reminder from ${advisorName}. `
      + `${reminder.title ? `You are advised to: ${reminder.title}.` : ''}`
      + amountText
      + descText
      + ` Please take action at your earliest convenience. For any queries, contact your advisor. Thank you.`

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">${script}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">Goodbye and have a great day.</Say>
</Response>`

    const call = await client.calls.create({ twiml, to: formattedPhone, from: TWILIO_FROM })

    // Mark reminder as fired
    const existing = (session.extractedData as any) || {}
    const reminders: any[] = (existing.financeReminders || []).map((r: any) =>
      r.id === reminder.id ? { ...r, fired: true, lastCalledAt: new Date().toISOString(), callSid: call.sid } : r
    )
    await prisma.session.update({
      where: { id: sessionId },
      data: { extractedData: { ...existing, financeReminders: reminders }, updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      callStatus: call.status,
      message: `Investment reminder call initiated to ${formattedPhone}`
    })
  } catch (error: any) {
    console.error('Finance reminder call error:', error)
    return NextResponse.json({ error: error.message || 'Failed to make call' }, { status: 500 })
  }
}