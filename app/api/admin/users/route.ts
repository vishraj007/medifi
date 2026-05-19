// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createAuditLog } from '@/lib/middleware/audit'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = req.headers.get('x-user-id')!
    const { email, name, role, department, password } = await req.json()

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        department,
        password: hashedPassword
      }
    })

    await createAuditLog({
      userId: adminId,
      action: 'CREATE_USER',
      resource: `User:${user.id}`,
      details: { email, role }
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}