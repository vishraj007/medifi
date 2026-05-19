// app/api/medications/[sessionId]/route.ts
// Stores medication schedules as JSON inside session.extractedData.medicationSchedules

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
    const medications: any[] = data.medicationSchedules || []

    return NextResponse.json({ medications })
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

    const body = await req.json()
    const { medication } = body // single medication object to add/update

    if (!medication || !medication.name) {
      return NextResponse.json({ error: 'medication.name is required' }, { status: 400 })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { extractedData: true }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const existing = (session.extractedData as any) || {}
    const meds: any[] = existing.medicationSchedules || []

    // Upsert by id
    const idx = meds.findIndex((m: any) => m.id === medication.id)
    if (idx >= 0) {
      meds[idx] = medication
    } else {
      meds.push({ ...medication, id: medication.id || crypto.randomUUID(), createdAt: new Date().toISOString() })
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        extractedData: { ...existing, medicationSchedules: meds },
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ medications: meds })
  } catch (error: any) {
    console.error('Medication save error:', error)
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

    const { medicationId } = await req.json()

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { extractedData: true }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const existing = (session.extractedData as any) || {}
    const meds: any[] = (existing.medicationSchedules || []).filter((m: any) => m.id !== medicationId)

    await prisma.session.update({
      where: { id: sessionId },
      data: { extractedData: { ...existing, medicationSchedules: meds }, updatedAt: new Date() }
    })

    return NextResponse.json({ medications: meds })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}