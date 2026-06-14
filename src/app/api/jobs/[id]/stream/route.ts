import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const poll = async () => {
        try {
          const job = await prisma.job.findUnique({
            where:  { id: params.id },
            select: { status: true, stage: true, errorMsg: true, drawingType: true, outputKeys: true },
          })
          if (job) send(job)
          if (job?.status === 'COMPLETE' || job?.status === 'FAILED') {
            controller.close()
            return
          }
          setTimeout(poll, 2000)
        } catch {
          controller.close()
        }
      }

      await poll()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
