'use client'
import { useEffect, useState } from 'react'
import { useParams }           from 'next/navigation'
import { StatusBadge }         from '@/components/ui/StatusBadge'

interface JobData {
  id:          string
  status:      string
  stage:       number
  inputName:   string | null
  drawingType: string | null
  pagesCount:  number
  processingMs: number | null
  errorMsg:    string | null
  outputUrls:  Record<string, string> | null
  createdAt:   string
  completedAt: string | null
}

const STAGE_LABELS = ['Queued', 'Parsing PDF', 'Layout Reasoning', '3D Generation', 'CAD Export']

export default function JobPage() {
  const { id }               = useParams<{ id: string }>()
  const [job, setJob]        = useState<JobData | null>(null)
  const [loading, setLoading] = useState(true)

  // Initial fetch
  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(r => r.json())
      .then(data => { setJob(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  // SSE stream
  useEffect(() => {
    if (!id) return
    const es = new EventSource(`/api/jobs/${id}/stream`)
    es.onmessage = (e) => {
      const update = JSON.parse(e.data)
      setJob(prev => prev ? { ...prev, ...update } : update)
      if (update.status === 'COMPLETE' || update.status === 'FAILED') {
        es.close()
        // Re-fetch to get signed download URLs
        fetch(`/api/jobs/${id}`)
          .then(r => r.json())
          .then(setJob)
      }
    }
    return () => es.close()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        Loading…
      </div>
    )
  }

  if (!job) {
    return (
      <div className="card p-12 text-center">
        <p className="text-text-muted">Job not found.</p>
      </div>
    )
  }

  const activeStage = job.status === 'COMPLETE' ? 4 : Math.max(0, job.stage - 1)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary truncate max-w-xl">
            {job.inputName ?? job.id}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {job.drawingType ?? 'Drawing'} · {job.pagesCount} page{job.pagesCount !== 1 ? 's' : ''}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Stage progress */}
      <div className="card p-6">
        <h2 className="text-sm font-medium text-text-muted mb-4">Processing stages</h2>
        <div className="space-y-3">
          {STAGE_LABELS.slice(1).map((label, i) => {
            const stageNum = i + 1
            const done     = job.status === 'COMPLETE' || stageNum < job.stage
            const active   = job.status === 'PROCESSING' && stageNum === job.stage
            return (
              <div key={label} className="flex items-center gap-4">
                <div className={[
                  'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0',
                  done   ? 'border-green bg-green/10 text-green'
                  : active ? 'border-cyan bg-cyan/10 text-cyan'
                  : 'border-border bg-card text-text-dim'
                ].join(' ')}>
                  {done ? '✓' : stageNum}
                </div>
                <span className={active ? 'text-cyan' : done ? 'text-text-primary' : 'text-text-dim'}>
                  {label}
                  {active && <span className="ml-2 text-cyan/60 text-xs animate-pulse">running…</span>}
                </span>
              </div>
            )
          })}
        </div>

        {job.processingMs && (
          <p className="text-text-dim text-xs mt-4">
            Completed in {(job.processingMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>

      {/* Error */}
      {job.status === 'FAILED' && job.errorMsg && (
        <div className="bg-red/10 border border-red/30 rounded-xl p-5">
          <p className="text-red font-medium mb-1">Processing failed</p>
          <p className="text-red/80 text-sm font-mono">{job.errorMsg}</p>
        </div>
      )}

      {/* Downloads */}
      {job.status === 'COMPLETE' && job.outputUrls && (
        <div className="card p-6">
          <h2 className="text-sm font-medium text-text-muted mb-4">Downloads</h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(job.outputUrls).map(([fmt, url]) => (
              <a
                key={fmt}
                href={url}
                download
                className="card p-4 flex flex-col items-center gap-2 hover:border-cyan/30
                           transition-colors text-center group"
              >
                <span className="text-2xl">{fmt === 'gltf' ? '🧊' : fmt === 'dxf' ? '📐' : '📦'}</span>
                <span className="text-text-primary font-medium uppercase text-xs">{fmt}</span>
                <span className="text-cyan text-xs group-hover:underline">Download</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
