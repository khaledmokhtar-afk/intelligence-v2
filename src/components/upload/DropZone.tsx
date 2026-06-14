'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter }   from 'next/navigation'
import { Button }      from '@/components/ui/Button'

export function DropZone({ userCredits = 0 }: { userCredits?: number }) {
  const router = useRouter()
  const [file, setFile]         = useState<File | null>(null)
  const [pages, setPages]       = useState(1)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setError(null)
    setPages(Math.max(1, Math.ceil(f.size / (200 * 1024))))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:       { 'application/pdf': ['.pdf'] },
    maxFiles:     1,
    maxSize:      50 * 1024 * 1024,
    onDropRejected: (e) => setError(e[0]?.errors[0]?.message ?? 'File rejected'),
  })

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('pagesCount', pages.toString())
      const res  = await fetch('/api/jobs/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      router.push(`/dashboard/jobs/${data.jobId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setUploading(false)
    }
  }

  const hasEnoughCredits = userCredits >= pages

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={[
          'border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-cyan bg-cyan/5 shadow-glow'
            : file
            ? 'border-green/50 bg-green/5'
            : 'border-[rgba(0,200,232,0.2)] hover:border-[rgba(0,200,232,0.4)] hover:bg-cyan/5',
        ].join(' ')}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="space-y-2">
            <div className="w-14 h-14 rounded-xl bg-green/10 border border-green/30 flex items-center justify-center mx-auto text-green text-2xl">
              ✓
            </div>
            <p className="font-medium text-text-primary">{file.name}</p>
            <p className="text-text-muted text-sm">
              {(file.size / 1024 / 1024).toFixed(2)} MB · approx. {pages} page{pages !== 1 ? 's' : ''}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="text-text-dim hover:text-red text-sm mt-2 transition-colors"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center mx-auto text-cyan text-2xl">
              ↑
            </div>
            <div>
              <p className="text-text-primary font-medium">
                {isDragActive ? 'Drop it here' : 'Drop your PDF here'}
              </p>
              <p className="text-text-muted text-sm mt-1">or click to browse — max 50MB</p>
            </div>
            <p className="text-text-dim text-xs">
              Supports architectural, mechanical, civil, and structural drawings
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-text-muted text-sm">Credits needed</p>
            <p className="text-text-primary font-semibold text-xl mt-0.5">
              {pages} credit{pages !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-text-muted text-sm">Your balance</p>
            <p className={`font-semibold text-xl mt-0.5 ${hasEnoughCredits ? 'text-green' : 'text-red'}`}>
              {userCredits} credits
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red/10 border border-red/30 rounded-xl p-4 text-red text-sm">
          {error}
        </div>
      )}

      {file && (
        <div className="flex gap-3">
          {hasEnoughCredits ? (
            <Button onClick={handleSubmit} loading={uploading} className="flex-1">
              Convert drawing →
            </Button>
          ) : (
            <a href="/dashboard/credits" className="btn-primary flex-1 text-center py-2.5">
              Buy credits to continue
            </a>
          )}
        </div>
      )}
    </div>
  )
}
