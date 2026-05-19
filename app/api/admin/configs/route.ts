// app/api/admin/configs/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/middleware/audit'

export async function GET() {
  try {
    const configs = await prisma.config.findMany({
      orderBy: { domain: 'asc' }
    })
    return NextResponse.json(configs)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch configs' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!
    const data = await req.json()

    const config = await prisma.config.create({
      data: {
        domain: data.domain,
        department: data.department,
        schema: data.schema,
        prompts: data.prompts,
        template: data.template
      }
    })

    await createAuditLog({
      userId,
      action: 'UPDATE_CONFIG',
      resource: `Config:${config.id}`,
      details: { domain: data.domain, department: data.department }
    })

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create config' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!
    const { id, ...updates } = await req.json()

    const config = await prisma.config.update({
      where: { id },
      data: updates
    })

    await createAuditLog({
      userId,
      action: 'UPDATE_CONFIG',
      resource: `Config:${id}`,
      details: updates
    })

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    )
  }
}