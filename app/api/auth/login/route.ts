// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth/jwt'
import { createAuditLog } from '@/lib/middleware/audit'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      department: user.department || undefined
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8 // 8 hours
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}