const styles: Record<string, string> = {
  QUEUED:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  PROCESSING: 'bg-cyan/10 text-cyan border-cyan/20',
  COMPLETE:   'bg-green/10 text-green border-green/20',
  FAILED:     'bg-red/10 text-red border-red/20',
}

const labels: Record<string, string> = {
  QUEUED:     'Queued',
  PROCESSING: 'Processing',
  COMPLETE:   'Complete',
  FAILED:     'Failed',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = styles[status] ?? 'bg-white/5 text-text-muted border-white/10'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status === 'PROCESSING' && (
        <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
      )}
      {labels[status] ?? status}
    </span>
  )
}
