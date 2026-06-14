'use client'
import type { JobStatus } from '@/types'

const STAGES = [
  { number: 1, label: 'Parse PDF',     sub: 'Claude Vision reads your drawing' },
  { number: 2, label: 'Reason Layout', sub: 'Geometry cleaned and structured' },
  { number: 3, label: 'Build 3D',      sub: 'Walls and rooms extruded' },
  { number: 4, label: 'Export CAD',    sub: 'DXF, OBJ, and GLTF created' },
]

export function PipelineStatus({ stage, status }: { stage: number; status: JobStatus }) {
  return (
    <div style={{ position: 'relative', paddingTop: 8 }}>
      {/* Connecting line */}
      <div style={{ position: 'absolute', top: 32, left: 24, right: 24, height: 1, background: 'rgba(0,200,232,0.1)' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        {STAGES.map((s) => {
          const isComplete = status === 'COMPLETE' || stage > s.number
          const isActive   = stage === s.number && (status === 'PROCESSING' || status === 'QUEUED')
          const isFailed   = status === 'FAILED' && stage === s.number

          let nodeBg = 'var(--color-surface)'
          let nodeBorder = 'rgba(0,200,232,0.12)'
          let nodeColor = 'var(--color-text-dim)'
          let nodeShadow = 'none'

          if (isComplete) {
            nodeBg = 'rgba(16,217,140,0.15)'; nodeBorder = 'var(--color-green)'; nodeColor = 'var(--color-green)'
            nodeShadow = '0 0 16px rgba(16,217,140,0.3)'
          } else if (isActive) {
            nodeBg = 'rgba(139,92,246,0.15)'; nodeBorder = 'var(--color-violet)'; nodeColor = 'var(--color-violet)'
          } else if (isFailed) {
            nodeBg = 'rgba(239,68,68,0.15)'; nodeBorder = 'var(--color-red)'; nodeColor = 'var(--color-red)'
          }

          return (
            <div key={s.number} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', border: `2px solid ${nodeBorder}`,
                background: nodeBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: nodeShadow, position: 'relative', zIndex: 1,
                transition: 'all 0.4s', color: nodeColor,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600,
              }}>
                {isComplete ? '✓' : isFailed ? '✕' : s.number}
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: 13, fontWeight: 500, margin: '0 0 4px',
                  color: (isComplete || isActive) ? 'var(--color-text-primary)' : 'var(--color-text-dim)',
                }}>
                  {s.label}
                  {isActive && <span style={{ display: 'block', fontSize: 11, color: 'var(--color-violet)', marginTop: 2, animation: 'pulse-ring 2s ease-in-out infinite' }}>running…</span>}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: 0, maxWidth: 90 }}>{s.sub}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
