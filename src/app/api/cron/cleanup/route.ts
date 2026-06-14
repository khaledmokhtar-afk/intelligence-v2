import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteFromS3 } from '@/lib/s3'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const oldJobs = await prisma.job.findMany({
    where: {
      createdAt: { lt: sevenDaysAgo },
      status:    { in: ['COMPLETE', 'FAILED'] },
    },
    select: { id: true, inputKey: true, outputKeys: true },
  })

  let deletedFiles = 0
  let deletedJobs  = 0

  for (const job of oldJobs) {
    const keysToDelete: string[] = [
      job.inputKey,
      `intermediate/${job.id}/parsed.json`,
      `intermediate/${job.id}/geometry.json`,
    ]

    if (job.outputKeys) {
      const out = job.outputKeys as Record<string, string>
      keysToDelete.push(...Object.values(out).filter(Boolean))
    }

    for (const key of keysToDelete) {
      try { await deleteFromS3(key); deletedFiles++ } catch { /* missing is fine */ }
    }

    await prisma.job.update({
      where: { id: job.id },
      data:  { status: 'EXPIRED', outputKeys: undefined },
    })
    deletedJobs++
  }

  return NextResponse.json({ cleaned: deletedJobs, filesDeleted: deletedFiles, timestamp: new Date().toISOString() })
}
