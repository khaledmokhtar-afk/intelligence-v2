'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PipelineStatus } from '@/components/pipeline/PipelineStatus'
import { DownloadPanel } from '@/components/downloads/DownloadPanel'
import type { JobStatus } from '@/types'

const ThreeViewer = dynamic(
  () => import('@/components/viewer/ThreeViewer').then(m => ({ default: m.ThreeViewer })),
  { ssr: false, loading: () => <ViewerSkeleton /> }
)

interface InitialJob {
  status: JobStatus
  stage: number
  inputName: string
  drawingType?: string
  errorMsg?: string
  pagesCount: number
  creditsUsed: number
  processingMs?: number
}

interface FullJob extends InitialJob {
  outputUrls?: Record<string, string>
}

export function JobViewerClient({ jobId, initialJob }: { jobId: string; initialJob: InitialJob }) {
  const [job, setJob]         = useState<InitialJob>(initialJob)
  const [fullJob, setFullJob] = useState<FullJob | null>(null)
  const [gltfUrl, setGltfUrl] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const fetchFull = () =>
    fetch(`/api/jobs/${jobId}`)
      .then(r => r.json())
      .then((data: FullJob) => {
        setJob(prev => ({ ...prev, ...data }))
        setFullJob(data)
        if (data.outputUrls?.gltf) setGltfUrl(data.outputUrls.gltf)
      })

  useEffect(() => {
    if (job.status === 'COMPLETE' || job.status === 'FAILED') {
      fetchFull()
      return
    }

    const es = new EventSource(`/api/jobs/${jobId}/stream`)
    esRef.current = es

    es.onmessage = (e) => {
      const update = JSON.parse(e.data)
      setJob(prev => ({ ...prev, ...update }))
      if (update.status === 'COMPLETE' || update.status === 'FAILED') {
        es.close()
        fetchFull()
      }
    }

    return () => es.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const isProcessing = job.status === 'QUEUED' || job.status === 'PROCESSING'
  const isComplete   = job.status === 'COMPLETE'
  const isFailed     = job.status === 'FAILED'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          {job.inputName}
        </h1>
        <StatusBadge status={job.status} />
        {job.drawingType && (
          <span style={{
            fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--color-text-muted)', background: 'var(--color-surface)',
            padding: '4px 10px', borderRadius: 6,
            border: '1px solid rgba(0,200,232,0.12)',
          }}>
            {job.drawingType}
          </span>
        )}
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* 3D Viewer */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 480 }}>
          {isComplete && gltfUrl ? (
            <ThreeViewer gltfUrl={gltfUrl} />
          ) : (
            <div style={{ width: '100%', height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
              {isProcessing && (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--color-violet)', fontSize: 26, display: 'inline-block', animation: 'spin 1.5s linear infinite' }}>⟳</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, margin: '0 0 6px' }}>Generating 3D model…</p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>Your viewer will appear here when ready</p>
                  </div>
                </>
              )}
              {isFailed && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-red)', fontWeight: 500, margin: '0 0 6px' }}>Processing failed</p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>{job.errorMsg ?? 'An error occurred'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pipeline */}
          <div className="card" style={{ padding: 24 }}>
            <span className="section-label">Processing pipeline</span>
            <PipelineStatus stage={job.stage} status={job.status} />
          </div>

          {/* Metadata */}
          <div className="card" style={{ padding: 24 }}>
            <span className="section-label">Details</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
              {[
                ['Pages', String(job.pagesCount)],
                ['Credits used', String(job.creditsUsed)],
                ['Processing time', job.processingMs ? `${(job.processingMs / 1000).toFixed(1)}s` : '—'],
                ['Drawing type', job.drawingType ?? '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 4 }}>{label}</p>
                  <p style={{ color: 'var(--color-text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Downloads */}
      {isComplete && fullJob?.outputUrls && (
        <DownloadPanel outputUrls={fullJob.outputUrls} inputName={job.inputName} />
      )}
    </div>
  )
}

function ViewerSkeleton() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 480, background: 'var(--color-surface)', animation: 'pulse-ring 2s ease-in-out infinite' }} />
  )
}
