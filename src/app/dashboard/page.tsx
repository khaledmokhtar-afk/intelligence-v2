import { getServerSession } from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'
import Link                  from 'next/link'
import { StatusBadge }       from '@/components/ui/StatusBadge'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user    = await prisma.user.findUnique({ where: { id: session!.user!.id! } })

  const jobs = await prisma.job.findMany({
    where:   { userId: session!.user!.id! },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })

  const now        = new Date()
  const weekAgo    = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisWeek   = jobs.filter(j => j.createdAt >= weekAgo && j.status === 'COMPLETE').length
  const pagesTotal = jobs.reduce((sum, j) => sum + j.pagesCount, 0)

  const greeting = (() => {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-text-muted mt-1">Here&apos;s what&apos;s happening with your drawings.</p>
        </div>
        <div className="card px-4 py-2 flex items-center gap-2 text-cyan">
          <span className="text-lg">⚡</span>
          <span className="font-semibold">{user?.credits ?? 0} credits</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total jobs',              value: jobs.length },
          { label: 'Completed this week',     value: thisWeek },
          { label: 'Pages processed',         value: pagesTotal },
        ].map(({ label, value }) => (
          <div key={label} className="card p-6">
            <p className="text-4xl font-bold text-cyan">{value}</p>
            <p className="text-text-muted text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick upload CTA */}
      <div className="card p-6 border-dashed border-cyan/20 flex items-center justify-between">
        <div>
          <p className="font-medium text-text-primary">Ready to convert your next drawing?</p>
          <p className="text-text-muted text-sm mt-0.5">Upload a 2D PDF and get a 3D model in minutes</p>
        </div>
        <Link href="/dashboard/new" className="btn-primary whitespace-nowrap">
          Upload a PDF →
        </Link>
      </div>

      {/* Jobs table */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recent conversions</h2>

        {jobs.length === 0 ? (
          <div className="card p-16 text-center">
            <p className="text-5xl mb-4">📐</p>
            <p className="text-text-primary font-medium">No conversions yet</p>
            <p className="text-text-muted text-sm mt-1 mb-6">Upload your first PDF to get started</p>
            <Link href="/dashboard/new" className="btn-primary">
              Upload a drawing
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-text-dim text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">File</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Created</th>
                  <th className="px-6 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-text-primary truncate max-w-[200px]">
                      {job.inputName ?? job.id}
                    </td>
                    <td className="px-6 py-4 text-text-muted capitalize">
                      {job.drawingType ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {job.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="text-cyan hover:underline text-xs"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
