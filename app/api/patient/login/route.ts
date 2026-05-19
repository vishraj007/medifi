// app/api/patient/login/route.ts
// Simple login: patient enters phone number → if found, issue JWT and redirect to dashboard.
// No OTP required.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const SECRET = process.env.NEXTAUTH_SECRET!

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 })
    }

    const person = await prisma.person.findUnique({ where: { phone } })
    if (!person) {
      return NextResponse.json(
        { error: 'No account found with this number. Please register or contact your doctor.' },
        { status: 404 }
      )
    }

    const token = jwt.sign(
      { personId: person.id, phone: person.phone, name: person.name, role: 'PATIENT' },
      SECRET,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({
      success: true,
      person: { id: person.id, name: person.name, phone: person.phone }
    })

    response.cookies.set('patient_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error: any) {
    console.error('Patient login error:', error)
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 })
  }
}