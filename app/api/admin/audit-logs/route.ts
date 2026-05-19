// app/api/admin/audit-logs/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (action) where.action = action
    if (userId) where.userId = userId

    const logs = await prisma.auditLog.findMany({
      where,
      include: { 
        user: { 
          select: { name: true, email: true } 
        } 
      },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await prisma.auditLog.count({ where })

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}