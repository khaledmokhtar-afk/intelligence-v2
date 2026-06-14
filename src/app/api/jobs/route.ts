import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma }       from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const ip      = req.headers.get('x-forwarded-for') ?? 'anonymous'

  const jobs = await prisma.job.findMany({
    where: session?.user?.id
      ? { userId: session.user.id }
      : { sessionId: ip },
    orderBy: { createdAt: 'desc' },
    take:    50,
    select: {
      id: true, status: true, stage: true, inputName: true,
      pagesCount: true, drawingType: true, createdAt: true,
      completedAt: true, processingMs: true,
    },
  })

  return NextResponse.json({ jobs })
}
