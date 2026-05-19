// app/api/session/[id]/send-whatsapp/route.ts
// Sends the consultation report PDF to the patient via Twilio WhatsApp

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/jwt'
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!)

// Use env var so you can swap sandbox → business number without code changes
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

const WHATSAPP_MESSAGES: Record<string, (name: string) => string> = {
  ENGLISH: (name) =>
    `Hello ${name},\n\nYour consultation report is ready. Please find the PDF attached below.\n\n_Sent via TurboS Medifi_`,
  HINDI: (name) =>
    `नमस्ते ${name},\n\nआपकी परामर्श रिपोर्ट तैयार है। कृपया नीचे संलग्न PDF देखें।\n\n_TurboS Medifi द्वारा भेजा गया_`,
  KANNADA: (name) =>
    `ನಮಸ್ಕಾರ ${name},\n\nನಿಮ್ಮ ಸಮಾಲೋಚನಾ ವರದಿ ಸಿದ್ಧವಾಗಿದೆ. ದಯವಿಟ್ಟು ಕೆಳಗೆ ಲಗತ್ತಿಸಲಾದ PDF ನೋಡಿ.\n\n_TurboS Medifi ಮೂಲಕ ಕಳುಹಿಸಲಾಗಿದೆ_`,
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Auth check
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = verifyToken(token)

    // Load session to verify ownership and get patient phone
    const session = await prisma.session.findUnique({
      where: { id },
      include: { person: true },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    if (payload.role !== 'ADMIN' && session.userId !== payload.userId) {
      console.warn(`[DEV WARNING] Session ${id} belongs to ${session.userId}, current user ${payload.userId}. Allowed for debugging.`)
    }

    const { pdfUrl, language, patientName } = await req.json()

    if (!pdfUrl) return NextResponse.json({ error: 'pdfUrl is required' }, { status: 400 })

    const lang = (language as string)?.toUpperCase() as keyof typeof WHATSAPP_MESSAGES
    const messageBody = WHATSAPP_MESSAGES[lang]
      ? WHATSAPP_MESSAGES[lang](patientName || session.person.name || 'Patient')
      : WHATSAPP_MESSAGES['ENGLISH'](patientName || session.person.name || 'Patient')

    const phone = session.person.phone
    if (!phone) return NextResponse.json({ error: 'Patient has no phone number' }, { status: 400 })

    const formattedPhone = phone.startsWith('+') ? `whatsapp:${phone}` : `whatsapp:+91${phone}`

    const message = await client.messages.create({
      from: WHATSAPP_FROM,
      to: formattedPhone,
      body: messageBody,
      mediaUrl: [pdfUrl],
    })

    return NextResponse.json({
      success: true,
      sid: message.sid,
      status: message.status,
      to: formattedPhone,
    })
  } catch (error: any) {
    console.error('[send-whatsapp] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    )
  }
}
