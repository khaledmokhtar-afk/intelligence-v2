import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma }       from '@/lib/prisma'
import { uploadToS3 }   from '@/lib/s3'
import { jobQueue }     from '@/lib/queue'
import { Redis }        from 'ioredis'

const ioredis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

const MAX_FILE_SIZE = 50 * 1024 * 1024
const RATE_LIMIT    = parseInt(process.env.RATE_LIMIT_JOBS_PER_HOUR ?? '3')

export async function POST(req: NextRequest) {
  try {
    const session  = await getServerSession(authOptions)
    const clientId = session?.user?.id ?? req.headers.get('x-forwarded-for') ?? 'anonymous'

    // Rate limiting
    const rateKey = `rate:upload:${clientId}`
    const count   = await ioredis.incr(rateKey)
    if (count === 1) await ioredis.expire(rateKey, 3600)
    if (count > RATE_LIMIT && session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: `Rate limit: ${RATE_LIMIT} uploads per hour.` },
        { status: 429 }
      )
    }

    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.type !== 'application/pdf')
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })

    const pagesCount = parseInt((formData.get('pagesCount') as string) ?? '1') || 1

    // Credit check
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } })
      if (!user || user.credits < pagesCount) {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsNeeded: pagesCount, creditsAvailable: user?.credits ?? 0 },
          { status: 402 }
        )
      }
    }

    // Upload to R2
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const jobId  = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const key    = `uploads/${jobId}/input.pdf`
    await uploadToS3(key, buffer, 'application/pdf')

    // Create job + deduct credits atomically
    const job = await prisma.$transaction(async (tx) => {
      if (session?.user?.id) {
        await tx.user.update({
          where: { id: session.user.id },
          data:  { credits: { decrement: pagesCount } },
        })
      }
      return tx.job.create({
        data: {
          id:             jobId,
          userId:         session?.user?.id ?? null,
          inputKey:       key,
          inputName:      file.name,
          inputSizeBytes: file.size,
          pagesCount,
          creditsUsed:    session?.user?.id ? pagesCount : 0,
          sessionId:      !session?.user?.id ? clientId : null,
        },
      })
    })

    // Enqueue
    await jobQueue.add(
      'process-pdf',
      { jobId: job.id, inputKey: key, pagesCount },
      { jobId: job.id, priority: session?.user?.id ? 1 : 5 }
    )

    return NextResponse.json({ jobId: job.id, status: 'QUEUED' })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
