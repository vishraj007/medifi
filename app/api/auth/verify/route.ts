// app/api/auth/verify/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
}