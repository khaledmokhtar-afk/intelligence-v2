import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'ADMIN') redirect('/')

  const [totalJobs, completeJobs, failedJobs, totalUsers, recentJobs] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: 'COMPLETE' } }),
    prisma.job.count({ where: { status: 'FAILED'   } }),
    prisma.user.count(),
    prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { email: true } } },
    }),
  ])

  const stats = [
    { label: 'Total Jobs',  value: totalJobs   },
    { label: 'Complete',    value: completeJobs },
    { label: 'Failed',      value: failedJobs  },
    { label: 'Total Users', value: totalUsers  },
  ]

  return (
    <div style={{ maxWidth: 1152, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 32 }}>
        Admin Panel
      </h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map(stat => (
          <div key={stat.label} className="card" style={{ padding: 20 }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 8px' }}>{stat.label}</p>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 36, fontWeight: 700, color: 'var(--color-cyan)', margin: 0 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Jobs table */}
      <div className="card" style={{ padding: 24 }}>
        <span className="section-label">Recent jobs</span>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,200,232,0.1)', textAlign: 'left' }}>
                {['Job ID', 'File', 'User', 'Status', 'Time', 'Created'].map(h => (
                  <th key={h} style={{ paddingBottom: 12, paddingRight: 16, color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentJobs.map(job => (
                <tr key={job.id} style={{ borderBottom: '1px solid rgba(0,200,232,0.04)' }}>
                  <td style={{ padding: '12px 16px 12px 0', fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-dim)', fontSize: 12 }}>
                    <a href={`/dashboard/jobs/${job.id}`} style={{ color: 'var(--color-cyan)', textDecoration: 'none' }}>
                      {job.id.slice(0, 12)}…
                    </a>
                  </td>
                  <td style={{ padding: '12px 16px 12px 0', color: 'var(--color-text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.inputName}
                  </td>
                  <td style={{ padding: '12px 16px 12px 0', color: 'var(--color-text-muted)' }}>
                    {job.user?.email ?? 'anonymous'}
                  </td>
                  <td style={{ padding: '12px 16px 12px 0' }}>
                    <span className={`status-badge-${job.status.toLowerCase()}`}>{job.status.toLowerCase()}</span>
                  </td>
                  <td style={{ padding: '12px 16px 12px 0', fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-dim)', fontSize: 12 }}>
                    {job.processingMs ? `${(job.processingMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td style={{ padding: '12px 0 12px 0', fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-dim)', fontSize: 12 }}>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
