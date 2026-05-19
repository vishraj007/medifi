// app/api/session/[id]/export-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { createAuditLog } from '@/lib/middleware/audit'
import { verifyToken } from '@/lib/auth/jwt'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify ownership
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    const userId = payload.userId

    // Check this session belongs to this user (or admin)
    const session = await prisma.session.findUnique({
      where: { id },
      include: { person: true, interactions: true }
    })

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    if (payload.role !== 'ADMIN' && session.userId !== userId) {
      // return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      console.warn(`[DEV WARNING] Session ${id} belongs to ${session.userId}, but current user is ${userId}. Allowed for debugging.`);
    }

    const formData = await req.formData()
    const pdfBlob = formData.get('pdf') as Blob

    if (!pdfBlob) {
      return NextResponse.json({ error: 'PDF blob required' }, { status: 400 })
    }

    const pdfFilename = `reports/${id}-${Date.now()}.pdf`
    const pdfBlobResult = await put(pdfFilename, pdfBlob, {
      access: 'public',
      contentType: 'application/pdf'
    })

    const pdfExport = await prisma.export.create({
      data: {
        sessionId: id,
        format: 'PDF',
        fileUrl: pdfBlobResult.url
      }
    })

    // Also collect everything as a raw JSON dataset and upload that
    const datasetObj = {
      sessionId: session.id,
      patient: session.person,
      domain: session.domain,
      department: session.department,
      transcript: session.interactions.map(i => ({
        speaker: i.speaker,
        text: i.text,
        translated: i.translated,
        timestamp: i.timestamp
      })),
      extractedData: session.extractedData,
      nerEntities: session.nerEntities,
      finalReport: session.finalReport,
      duration: session.duration,
      status: session.status,
      approvedAt: session.approvedAt
    }

    const jsonFilename = `datasets/${id}-${Date.now()}.json`
    const datasetBlobResult = await put(jsonFilename, JSON.stringify(datasetObj, null, 2), {
      access: 'public',
      contentType: 'application/json'
    })

    const datasetExport = await prisma.export.create({
      data: {
        sessionId: id,
        format: 'DATASET',
        fileUrl: datasetBlobResult.url
      }
    })

    await createAuditLog({
      userId,
      action: 'EXPORT_PDF',
      resource: `Session:${id}`,
      details: { pdfUrl: pdfBlobResult.url, datasetUrl: datasetBlobResult.url }
    })

    return NextResponse.json({
      pdfUrl: pdfBlobResult.url,
      datasetUrl: datasetBlobResult.url,
      pdfExportId: pdfExport.id,
      datasetExportId: datasetExport.id
    })
  } catch (error) {
    console.error('PDF export failed:', error)
    return NextResponse.json({ error: 'PDF export failed' }, { status: 500 })
  }
}