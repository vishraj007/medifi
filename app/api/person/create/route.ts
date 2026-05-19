import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { phone, name, email, age, gender } = body

    // ✅ validate phone
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone is required' },
        { status: 400 }
      )
    }

    // ✅ normalize phone
    const cleanPhone = phone.trim()

    // ✅ upsert instead of create (prevents crash)
    const person = await prisma.person.upsert({
      where: { phone: cleanPhone },
      update: {
        name: name || undefined,
        email: email || undefined,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
      },
      create: {
        phone: cleanPhone,
        name: name || null,
        email: email || null,
        age: age ? parseInt(age) : null,
        gender: gender || null,
      }
    })

    return NextResponse.json(person)
  } catch (error: any) {
    console.error('❌ Person creation error:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to create person' },
      { status: 500 }
    )
  }
}