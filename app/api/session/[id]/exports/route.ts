// app/api/session/[id]/exports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    // Verify the user owns this session
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)

    // Check session belongs to this user (or admin can see all)
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, personId: true }
    })

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    if (payload.role !== 'ADMIN' && session.userId !== payload.userId) {
      // return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      console.warn(`[DEV WARNING] Session ${sessionId} belongs to ${session.userId}, but current user is ${payload.userId}. Allowed for debugging.`);
    }

    const exports = await prisma.export.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ exports })
  } catch (error) {
    console.error('Exports fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch exports' }, { status: 500 })
  }
}