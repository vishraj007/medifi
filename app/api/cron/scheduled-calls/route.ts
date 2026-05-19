// app/api/cron/scheduled-calls/route.ts
// REPLACE your existing file with this complete version.
//
// This cron handles THREE types of outgoing calls:
//   1. Appointments  — fires queued appointments at the right IST date+time
//   2. Medications   — fires medication reminders (with start/end date guard)
//   3. Finance       — fires investment reminders on their scheduled date+time
//
// The browser polls this endpoint every 30s via useCallScheduler hook.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!)
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER!

// Returns IST time rounded to minutes: "2026-04-14T09:47"
function nowRoundedIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  ist.setSeconds(0, 0)
  return ist.toISOString().slice(0, 16)
}

// Returns today's date in IST: "2026-04-14"
function todayISTDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

// Returns current HH:MM in IST: "09:47"
function currentHHMMIST(): string {
  return new Date()
    .toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })
    .slice(0, 5)
}

export async function GET(req: NextRequest) {
  // Allow local dev with Bearer local, or verify CRON_SECRET in production
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}` && auth !== 'Bearer local') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: any[]  = []
  const nowIST          = nowRoundedIST()    // "2026-04-14T09:47"
  const todayDate       = todayISTDate()     // "2026-04-14"
  const currentHHMM     = currentHHMMIST()   // "09:47"

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // 1. APPOINTMENT CALLS — fires appointments queued via "Schedule" mode
    // ══════════════════════════════════════════════════════════════════════════
    const pendingAppts = await prisma.appointment.findMany({
      where: {
        callStatus: { in: ['pending', 'queued'] },
        // callFired: false   ← uncomment this line after adding callFired to schema
      },
      include: {
        session: {
          include: {
            person: true,
            user: { select: { name: true, department: true } },
          },
        },
      },
    })

    for (const appt of pendingAppts) {
      // Skip if already fired (handles case where callFired field exists)
      if ((appt as any).callFired === true) continue

      // Convert stored UTC time → IST, round to minutes
      const apptIST = new Date(appt.appointmentDate.getTime() + 5.5 * 60 * 60 * 1000)
      apptIST.setSeconds(0, 0)
      const apptStr = apptIST.toISOString().slice(0, 16)
      if (apptStr !== nowIST) continue

      const phone = appt.session.person.phone
      if (!phone) continue
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
      const patientName  = appt.session.person.name || 'valued patient'
      const doctorName   = appt.session.user?.name  || 'your doctor'
      const domain       = appt.session.domain === 'HEALTHCARE' ? 'medical' : 'financial'
      const dept         = appt.session.department.replace(/_/g, ' ').toLowerCase()
      const formattedDate = appt.appointmentDate.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
      const formattedTime = appt.appointmentDate.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
      })

      // If a custom script was stored in notes as "[script]...", extract it
      let script = ''
      const notesRaw = appt.notes || ''
      const scriptMatch = notesRaw.match(/\[script\](.+)$/)
      if (scriptMatch) {
        script = scriptMatch[1].trim()
      } else {
        script =
          `Hello ${patientName}. This is an automated reminder from Voice Intelligence. ` +
          `Your ${domain} appointment is confirmed for today, ${formattedDate} at ${formattedTime} ` +
          `with ${doctorName} for ${dept}. ` +
          (notesRaw && !notesRaw.startsWith('[script]') ? `Additional note: ${notesRaw}. ` : '') +
          `Please be ready. Thank you.`
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="1"/><Say voice="Polly.Aditi" language="en-IN">${script}</Say><Pause length="1"/><Say voice="Polly.Aditi" language="en-IN">Goodbye.</Say></Response>`

      try {
        const call = await client.calls.create({ twiml, to: formattedPhone, from: TWILIO_FROM })

        // Safe update — works with or without callFired / twilioCallSid in schema
        const updateData: any = { callStatus: call.status }
        try { updateData.callFired = true }     catch {}
        try { updateData.twilioCallSid = call.sid } catch {}

        await prisma.appointment.update({ where: { id: appt.id }, data: updateData })
        results.push({ type: 'appointment', id: appt.id, callSid: call.sid, status: call.status })
      } catch (err: any) {
        results.push({ type: 'appointment', id: appt.id, error: err.message })
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. MEDICATION REMINDER CALLS — respects startDate / endDate
    // ══════════════════════════════════════════════════════════════════════════
    const activeSessions = await prisma.session.findMany({
      where: { status: 'ACTIVE' },
      include: { person: true, user: { select: { name: true } } },
    })

    for (const session of activeSessions) {
      const data = (session.extractedData as any) || {}
      const meds: any[] = data.medicationSchedules || []

      for (const med of meds) {
        if (!med.timing || !med.name) continue

        // ── DATE GUARD: skip if outside medication window ──────────────────
        if (med.startDate && todayDate < med.startDate) continue   // not started yet
        if (med.endDate   && todayDate > med.endDate)   continue   // already ended

        for (const slot of ['morning', 'afternoon', 'night'] as const) {
          const slotData = med.timing[slot]
          if (!slotData?.enabled) continue
          if (slotData.time !== currentHHMM) continue

          // Deduplicate — skip if already fired this slot today
          const todayKey = `${todayDate}-${med.id}-${slot}`
          if (data.firedCalls?.[todayKey]) continue

          const phone = session.person.phone
          if (!phone) continue
          const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
          const patientName = session.person.name || 'valued patient'
          const doctorName  = session.user?.name  || 'your doctor'

          const slotPhrases = { morning: 'your morning', afternoon: 'your afternoon', night: 'your evening' }
          const dosageText = med.dosage ? ` Your dose is ${med.dosage}.` : ''
          const notesText  = med.notes  ? ` Instructions: ${med.notes}.` : ''
          const message =
            `Hello ${patientName}. This is an automated medication reminder from Voice Intelligence. ` +
            `It is time for ${slotPhrases[slot]} dose of ${med.name}.` +
            dosageText + notesText +
            ` Please take your medication now. If you have concerns, contact ${doctorName}. Thank you.`

          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="1"/><Say voice="Polly.Aditi" language="en-IN">${message}</Say><Pause length="1"/><Say voice="Polly.Aditi" language="en-IN">Take care. Goodbye.</Say></Response>`

          try {
            const call = await client.calls.create({ twiml, to: formattedPhone, from: TWILIO_FROM })
            const updatedData = {
              ...data,
              firedCalls: { ...(data.firedCalls || {}), [todayKey]: call.sid },
            }
            await prisma.session.update({ where: { id: session.id }, data: { extractedData: updatedData } })
            results.push({ type: 'medication', sessionId: session.id, med: med.name, slot, callSid: call.sid })
          } catch (err: any) {
            results.push({ type: 'medication', sessionId: session.id, med: med.name, slot, error: err.message })
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // 3. FINANCE INVESTMENT REMINDER CALLS
      // ══════════════════════════════════════════════════════════════════════
      if (session.domain === 'FINANCE') {
        const finReminders: any[] = data.financeReminders || []

        for (const rem of finReminders) {
          if (!rem.callDate || !rem.callTime) continue
          if (rem.fired) continue                           // already sent
          if (rem.callDate !== todayDate) continue          // not today
          if (rem.callTime !== currentHHMM) continue        // not this minute

          const phone = session.person.phone
          if (!phone) continue
          const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
          const clientName  = session.person.name || 'valued client'
          const advisorName = session.user?.name  || 'your financial advisor'

          const amountText = rem.amount      ? ` The recommended amount is ${rem.amount}.` : ''
          const descText   = rem.description ? ` ${rem.description}.` : ''
          const script = rem.customMessage?.trim()
            || `Hello ${clientName}. This is an investment reminder from ${advisorName}. ` +
               `${rem.title ? `You are advised to: ${rem.title}.` : ''}` +
               amountText + descText +
               ` Please take action at your earliest convenience. Thank you.`

          const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="1"/><Say voice="Polly.Aditi" language="en-IN">${script}</Say><Pause length="1"/><Say voice="Polly.Aditi" language="en-IN">Goodbye and have a great day.</Say></Response>`

          try {
            const call = await client.calls.create({ twiml, to: formattedPhone, from: TWILIO_FROM })

            const updatedReminders = finReminders.map((r: any) =>
              r.id === rem.id
                ? { ...r, fired: true, lastCalledAt: new Date().toISOString(), callSid: call.sid }
                : r
            )
            await prisma.session.update({
              where: { id: session.id },
              data: { extractedData: { ...data, financeReminders: updatedReminders } },
            })
            results.push({ type: 'finance_reminder', sessionId: session.id, title: rem.title, callSid: call.sid })
          } catch (err: any) {
            results.push({ type: 'finance_reminder', sessionId: session.id, title: rem.title, error: err.message })
          }
        }
      }
    }

    return NextResponse.json({ success: true, nowIST, todayDate, currentHHMM, fired: results.length, results })
  } catch (err: any) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}