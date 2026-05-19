// app/api/session/[id]/stream/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// ✅ REMOVE: export const runtime = 'edge'
// Use default Node.js runtime instead

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Initial data
        const session = await prisma.session.findUnique({
          where: { id },
          include: { person: true }
        })

        if (session) {
          const data = `data: ${JSON.stringify(session)}\n\n`
          controller.enqueue(encoder.encode(data))
        }

        // Poll for updates
        const intervalId = setInterval(async () => {
          try {
            const updatedSession = await prisma.session.findUnique({
              where: { id },
              select: {
                transcript: true,
                translatedText: true,
                extractedData: true,
                nerEntities: true,
                finalReport: true,
                updatedAt: true,
                status: true,
                approved: true
              }
            })

            if (updatedSession) {
              const data = `data: ${JSON.stringify(updatedSession)}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          } catch (error) {
            console.error('Polling error:', error)
          }
        }, 2000)

        req.signal.addEventListener('abort', () => {
          clearInterval(intervalId)
          controller.close()
        })
      } catch (error) {
        controller.error(error)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}