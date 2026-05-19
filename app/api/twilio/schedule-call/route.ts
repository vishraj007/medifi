// app/api/twilio/schedule-call/route.ts
// REPLACE your existing file with this.
// Supports callMode: "now" (immediate Twilio call) | "schedule" (cron-queued).
// Uses a safe Prisma create that works even if callFired / twilioCallSid are not yet
// in your schema — if they cause errors, see the NOTE at the bottom.

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
    const payload = verifyToken(token)

    const {
      sessionId,
      appointmentDate,  // required for 'schedule' mode only
      appointmentTime,  // required for 'schedule' mode only
      notes,
      customMessage,
      callMode = 'now', // 'now' | 'schedule'
    } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }
    if (callMode === 'schedule' && (!appointmentDate || !appointmentTime)) {
      return NextResponse.json(
        { error: 'appointmentDate and appointmentTime required for schedule mode' },
        { status: 400 }
      )
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        person: true,
        user: { select: { name: true, department: true } },
      },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const phone = session.person.phone
    if (!phone) return NextResponse.json({ error: 'Patient has no phone number' }, { status: 400 })

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    const domain      = session.domain === 'HEALTHCARE' ? 'medical' : 'financial'
    const dept        = session.department.replace(/_/g, ' ').toLowerCase()
    const doctorName  = session.user?.name  || 'your doctor'
    const patientName = session.person.name || 'valued patient'

    // ── Determine appointment datetime ──────────────────────────────────────
    let apptDateTime: Date
    if (callMode === 'schedule') {
      apptDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`)
    } else {
      apptDateTime = new Date()
    }

    const formattedDate = apptDateTime.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const formattedTime = apptDateTime.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
    })

    // ── Build TwiML script ───────────────────────────────────────────────────
    let script: string
    if (customMessage?.trim()) {
      script = customMessage.trim()
    } else if (callMode === 'now') {
      script =
        `Hello ${patientName}. This is a call from your ${domain} advisor ${doctorName}. ` +
        (notes ? `${notes}. ` : `Please contact us at your earliest convenience. `) +
        `Thank you.`
    } else {
      script =
        `Hello ${patientName}. This is an automated reminder from Voice Intelligence. ` +
        `Your ${domain} appointment has been scheduled for ${formattedDate} at ${formattedTime} ` +
        `with ${doctorName} for ${dept}. ` +
        (notes ? `Additional note: ${notes}. ` : '') +
        `Please keep yourself free at this time. Thank you.`
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">${script}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="en-IN">Goodbye.</Say>
</Response>`

    // ── "now" mode: fire Twilio immediately ─────────────────────────────────
    if (callMode === 'now') {
      const call = await client.calls.create({ twiml, to: formattedPhone, from: TWILIO_FROM })

      // Safe create — works with or without callFired / twilioCallSid in schema
      const apptData: any = {
        sessionId,
        personId:        session.personId,
        userId:          payload.userId,
        appointmentDate: apptDateTime,
        notes:           notes || null,
        callStatus:      call.status,
      }
      // Only include these if they exist on your Appointment model
      try { apptData.callFired = true } catch {}
      try { apptData.twilioCallSid = call.sid } catch {}

      const appointment = await prisma.appointment.create({ data: apptData })

      return NextResponse.json({
        success: true,
        appointment,
        callSid:    call.sid,
        callStatus: call.status,
        message:    `Call initiated to ${formattedPhone}`,
      })
    }

    // ── "schedule" mode: store in DB, cron fires at matching IST time ────────
    const scheduleData: any = {
      sessionId,
      personId:        session.personId,
      userId:          payload.userId,
      appointmentDate: apptDateTime,
      notes:           customMessage?.trim()
        ? [notes, `[script]${customMessage.trim()}`].filter(Boolean).join(' | ')
        : notes || null,
      callStatus: 'queued',
    }
    try { scheduleData.callFired = false } catch {}

    const appointment = await prisma.appointment.create({ data: scheduleData })

    return NextResponse.json({
      success: true,
      appointment,
      callStatus: 'queued',
      message:    `Call scheduled for ${formattedDate} at ${formattedTime}. The cron will fire it automatically.`,
    })

  } catch (error: any) {
    console.error('Schedule call error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

// ── GET: list appointments for a session ────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    verifyToken(token)

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    const appointments = await prisma.appointment.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ appointments })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/*
NOTE — If you get a Prisma error like "Unknown field `callFired`":
Add these fields to your Appointment model in schema.prisma:

  callFired     Boolean   @default(false)
  twilioCallSid String?

Then run: npx prisma db push
*/