// app/api/session/[id]/add-message/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { speaker, text, translated } = await req.json()

    const interaction = await prisma.interaction.create({
      data: {
        sessionId: id,
        speaker,
        text,
        translated
      }
    })

    return NextResponse.json(interaction)
  } catch (error) {
    console.error('Add message error:', error)
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    )
  }
}