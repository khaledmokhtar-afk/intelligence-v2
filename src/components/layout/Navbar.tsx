'use client'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      borderBottom: '1px solid rgba(0,200,232,0.1)',
      background: 'rgba(3,7,15,0.85)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, #00C8E8, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#03070F', fontWeight: 700, fontSize: 14, fontFamily: 'Space Grotesk, sans-serif' }}>F</span>
          </div>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: '#E2EEF8', fontSize: 18 }}>FormForge</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/#how-it-works" style={{ color: '#6B8FAF', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#E2EEF8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6B8FAF')}>
            How it works
          </Link>
          <Link href="/#pricing" style={{ color: '#6B8FAF', fontSize: 14, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#E2EEF8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6B8FAF')}>
            Pricing
          </Link>

          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/dashboard" className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: 14 }}>Dashboard</Link>
              <button onClick={() => signOut()} style={{ color: '#6B8FAF', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => signIn()} style={{ color: '#6B8FAF', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>Sign in</button>
              <Link href="/dashboard/new" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 14, textDecoration: 'none' }}>Try free</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
