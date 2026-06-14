import { getServerSession } from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { redirect }          from 'next/navigation'
import Link                  from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-cyan font-bold text-lg tracking-tight">
            FormForge
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors">
              Jobs
            </Link>
            <Link href="/dashboard/new" className="text-text-muted hover:text-text-primary transition-colors">
              New
            </Link>
            <Link href="/dashboard/credits" className="text-text-muted hover:text-text-primary transition-colors">
              Credits
            </Link>
            <span className="text-text-dim">
              {session.user?.name ?? session.user?.email ?? 'User'}
            </span>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  )
}
