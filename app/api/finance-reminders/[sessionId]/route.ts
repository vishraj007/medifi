// app/api/finance-reminders/[sessionId]/route.ts
// Stores finance/investment reminders as JSON inside session.extractedData.financeReminders

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/jwt'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    verifyToken(token)

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { extractedData: true }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const data = (session.extractedData as any) || {}
    return NextResponse.json({ reminders: data.financeReminders || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    verifyToken(token)

    const { reminder } = await req.json()
    if (!reminder?.title) return NextResponse.json({ error: 'reminder.title is required' }, { status: 400 })

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { extractedData: true }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const existing = (session.extractedData as any) || {}
    const reminders: any[] = existing.financeReminders || []

    const idx = reminders.findIndex((r: any) => r.id === reminder.id)
    if (idx >= 0) {
      reminders[idx] = reminder
    } else {
      reminders.push({
        ...reminder,
        id: reminder.id || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        fired: false,
      })
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { extractedData: { ...existing, financeReminders: reminders }, updatedAt: new Date() }
    })

    return NextResponse.json({ reminders })
  } catch (error: any) {
    console.error('Finance reminder save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    verifyToken(token)

    const { reminderId } = await req.json()

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { extractedData: true }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const existing = (session.extractedData as any) || {}
    const reminders = (existing.financeReminders || []).filter((r: any) => r.id !== reminderId)

    await prisma.session.update({
      where: { id: sessionId },
      data: { extractedData: { ...existing, financeReminders: reminders }, updatedAt: new Date() }
    })

    return NextResponse.json({ reminders })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}