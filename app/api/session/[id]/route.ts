// app/api/session/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/middleware/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params // ← Add await here
    
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        person: true,
        user: true,
        interactions: {
          orderBy: { timestamp: 'asc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Load config
    const config = await prisma.config.findUnique({
      where: {
        domain_department: {
          domain: session.domain,
          department: session.department
        }
      }
    })

    return NextResponse.json({ ...session, config })
  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params // ← Add await here
    const userId = req.headers.get('x-user-id')!
    const updates = await req.json()

    const session = await prisma.session.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    })

    if (userId) {
      await createAuditLog({
        userId,
        action: 'UPDATE_SESSION',
        resource: `Session:${id}`,
        details: Object.keys(updates)
      })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Session update error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}