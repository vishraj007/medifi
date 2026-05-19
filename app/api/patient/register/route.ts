// app/api/patient/register/route.ts
// Patient self-registration: provide name + phone.
// If person already exists, logs them in.
// If not, creates a new Person record and issues JWT.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const SECRET = process.env.NEXTAUTH_SECRET!

export async function POST(req: NextRequest) {
  try {
    const { phone, name } = await req.json()

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 })
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Upsert person — if they already exist, just update name and log in
    const person = await prisma.person.upsert({
      where: { phone },
      update: { name: name.trim() },
      create: {
        phone,
        name: name.trim(),
        // Add any other required fields your schema needs
        // age: null, gender: null, email: null, etc.
      },
    })

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
    console.error('Patient register error:', error)
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 })
  }
}