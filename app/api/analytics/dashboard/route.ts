// app/api/analytics/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const domain = searchParams.get('domain') as any
    const department = searchParams.get('department') as any

    const startDate = startOfDay(subDays(new Date(), days))
    const endDate = endOfDay(new Date())

    const totalSessions = await prisma.session.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(domain && { domain }),
        ...(department && { department })
      }
    })

    const completedSessions = await prisma.session.count({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
        ...(domain && { domain }),
        ...(department && { department })
      }
    })

    const avgDurationResult = await prisma.session.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
        ...(domain && { domain }),
        ...(department && { department })
      },
      _avg: { duration: true }
    })

    const sessionsByDept = await prisma.session.groupBy({
      by: ['department'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(domain && { domain })
      },
      _count: true
    })

    const approvedCount = await prisma.session.count({
      where: {
        approved: true,
        createdAt: { gte: startDate, lte: endDate }
      }
    })

    return NextResponse.json({
      overview: {
        totalSessions,
        completedSessions,
        avgDuration: avgDurationResult._avg.duration || 0,
        approvalRate: totalSessions > 0 ? (approvedCount / totalSessions) * 100 : 0
      },
      sessionsByDepartment: sessionsByDept
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}