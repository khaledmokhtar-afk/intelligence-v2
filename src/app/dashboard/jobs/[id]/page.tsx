import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { JobViewerClient } from './JobViewerClient'
import type { JobStatus } from '@/types'

export default async function JobPage({ params }: { params: { id: string } }) {
  await getServerSession(authOptions) // ensure session cookie is read server-side
  const job = await prisma.job.findUnique({ where: { id: params.id } })
  if (!job) notFound()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-void)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/dashboard" style={{ color: 'var(--color-text-muted)', fontSize: 14, textDecoration: 'none' }}>
              ← Dashboard
            </a>
            <span style={{ color: 'var(--color-text-dim)' }}>/</span>
            <span style={{ color: 'var(--color-text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
              {params.id.slice(0, 12)}…
            </span>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{job.inputName}</span>
        </div>

        <JobViewerClient
          jobId={params.id}
          initialJob={{
            status:      job.status as JobStatus,
            stage:       job.stage,
            inputName:   job.inputName ?? job.id,
            drawingType: job.drawingType ?? undefined,
            errorMsg:    job.errorMsg ?? undefined,
            pagesCount:  job.pagesCount,
            creditsUsed: job.creditsUsed,
            processingMs: job.processingMs ?? undefined,
          }}
        />
      </div>
    </div>
  )
}
