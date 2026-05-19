
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    verifyToken(token)

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    const appointments = await prisma.appointment.findMany({
      where: sessionId ? { sessionId } : {},
      orderBy: { appointmentDate: 'asc' }
    })

    return NextResponse.json({ appointments })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}