// app/api/person/[phone]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { exists: false },
        { status: 404 }
      )
    }

    const person = await prisma.person.findUnique({
      where: { phone },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            domain: true,
            department: true,
            status: true,
            approved: true,
            createdAt: true,
            nerEntities: true,
            extractedData: true,
            finalReport: true,
          }
        }
      }
    })

    return NextResponse.json({
      exists: !!person,
      person: person || null
    })

  } catch (error) {
    console.error('Person lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch person' },
      { status: 500 }
    )
  }
}