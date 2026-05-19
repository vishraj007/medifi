// app/api/session/[id]/edit-message/route.ts
// FIXED: Saves all 3 language translations in one update when allTranslations is provided

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await req.json()
    const { interactionId, lang, text, allTranslations } = body

    if (!interactionId || !lang || text === undefined) {
      return NextResponse.json(
        { error: 'interactionId, lang, and text are required' },
        { status: 400 }
      )
    }

    let updateData: Record<string, string>

    if (allTranslations && typeof allTranslations === 'object') {
      // FIXED: When all three translations are provided (after re-translation),
      // save all of them in one DB write so every language is up to date.
      updateData = {}

      if (allTranslations.ENGLISH !== undefined) {
        updateData.text = allTranslations.ENGLISH
        updateData.translated = allTranslations.ENGLISH
      }
      if (allTranslations.HINDI !== undefined) {
        updateData.hindiText = allTranslations.HINDI
      }
      if (allTranslations.KANNADA !== undefined) {
        updateData.kannadaText = allTranslations.KANNADA
      }
    } else {
      // Legacy single-language update (backwards compatible)
      const fieldMap: Record<string, Record<string, string>> = {
        ENGLISH: { text, translated: text },
        HINDI:   { hindiText: text },
        KANNADA: { kannadaText: text },
      }

      updateData = fieldMap[lang]
      if (!updateData) {
        return NextResponse.json(
          { error: `Unsupported lang: ${lang}` },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.interaction.update({
      where: { id: interactionId },
      data: updateData,
    })

    return NextResponse.json({ success: true, interaction: updated })
  } catch (error: any) {
    console.error('Edit message error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to edit message' },
      { status: 500 }
    )
  }
}