// app/api/patient/dashboard/route.ts
// Returns all sessions, reports, medications and reminders for the authenticated patient.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const SECRET = process.env.NEXTAUTH_SECRET!

function verifyPatientToken(token: string): { personId: string; phone: string } {
  const payload = jwt.verify(token, SECRET) as any
  if (payload.role !== 'PATIENT') throw new Error('Not a patient token')
  return { personId: payload.personId, phone: payload.phone }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('patient_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { personId } = verifyPatientToken(token)

    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, name: true, phone: true, email: true, age: true, gender: true },
    })
    if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 })

    const sessions = await prisma.session.findMany({
      where: { personId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        domain: true,
        department: true,
        status: true,
        approved: true,
        createdAt: true,
        finalReport: true,
        smartSummary: true,
        extractedData: true,
        nerEntities: true,
        duration: true,
        user: { select: { name: true } },
      },
    })

    const shapedSessions = sessions.map(s => ({
      id: s.id,
      domain: s.domain,
      department: s.department,
      status: s.status,
      approved: s.approved,
      createdAt: s.createdAt,
      finalReport: s.finalReport,
      smartSummary: s.smartSummary,
      extractedData: s.extractedData,
      nerEntities: s.nerEntities,
      duration: s.duration,
      doctor: s.user ? { name: s.user.name } : null,
    }))

    return NextResponse.json({ person, sessions: shapedSessions })
  } catch (error: any) {
    console.error('Patient dashboard error:', error)
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}