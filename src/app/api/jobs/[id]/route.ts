import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'
import { getSignedDownloadUrl } from '@/lib/s3'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const job     = await prisma.job.findUnique({ where: { id: params.id } })

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
  if (job.userId && job.userId !== session?.user?.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!job.userId && job.sessionId !== ip)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let outputUrls: Record<string, string> | null = null
  if (job.status === 'COMPLETE' && job.outputKeys) {
    const keys = job.outputKeys as Record<string, string>
    outputUrls = {}
    for (const [format, key] of Object.entries(keys)) {
      if (key) outputUrls[format] = await getSignedDownloadUrl(key)
    }
  }

  return NextResponse.json({ ...job, outputUrls })
}
