// app/api/ai/past-sessions/route.ts
// Fetches past session context for a patient/client to enrich AI suggestions

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { personId, domain, department, currentSessionId } = await req.json()

    if (!personId) {
      return NextResponse.json({ error: 'Missing personId' }, { status: 400 })
    }

    // Fetch last 5 completed sessions for this person (excluding current)
    const pastSessions = await prisma.session.findMany({
      where: {
        personId,
        id: { not: currentSessionId || '' },
        status: { in: ['COMPLETED', 'ARCHIVED'] },
        // Optionally filter by same domain
        ...(domain ? { domain } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        domain: true,
        department: true,
        extractedData: true,
        nerEntities: true,
        createdAt: true,
        smartSummary: true,
      },
    })

    if (pastSessions.length === 0) {
      return NextResponse.json({ pastContext: null, sessionCount: 0 })
    }

    // Build a condensed summary of past sessions
    const pastContext = {
      sessionCount: pastSessions.length,
      sessions: pastSessions.map(s => ({
        date: s.createdAt.toISOString().slice(0, 10),
        department: s.department,
        extractedData: s.extractedData || {},
        entities: s.nerEntities || {},
        // Include english summary if available
        summary: (s.smartSummary as any)?.english?.mainProblem || null,
      })),
    }

    return NextResponse.json({ pastContext })
  } catch (error: any) {
    console.error('Past sessions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch past sessions', details: error.message },
      { status: 500 }
    )
  }
}
