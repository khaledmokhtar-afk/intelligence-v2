'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function SignInPage() {
  const [email, setEmail]       = useState('')
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState<string | null>(null)

  const handleOAuth = (provider: string) => {
    setLoading(provider)
    signIn(provider, { callbackUrl: '/dashboard' })
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading('email')
    await signIn('email', { email, callbackUrl: '/dashboard', redirect: false })
    setSent(true)
    setLoading(null)
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyan tracking-tight">FormForge</h1>
          <p className="text-text-muted mt-2 text-sm">
            Sign in to track your conversions and manage credits
          </p>
        </div>

        <div className="card p-8 space-y-4 border-[rgba(0,200,232,0.15)]">
          {sent ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-4xl">✉️</div>
              <p className="text-text-primary font-medium">Check your email</p>
              <p className="text-text-muted text-sm">We sent a magic link to <strong>{email}</strong></p>
            </div>
          ) : (
            <>
              {/* Google */}
              <button
                onClick={() => handleOAuth('google')}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                           bg-white text-gray-900 font-medium text-sm border border-gray-200
                           hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                {loading === 'google' ? 'Signing in…' : 'Continue with Google'}
              </button>

              {/* GitHub */}
              <button
                onClick={() => handleOAuth('github')}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                           bg-[#24292F] text-white font-medium text-sm border border-white/10
                           hover:bg-[#2d3440] transition-colors disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                {loading === 'github' ? 'Signing in…' : 'Continue with GitHub'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-text-dim text-xs">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Magic link */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="input"
                />
                <button
                  type="submit"
                  disabled={!!loading || !email}
                  className="btn-secondary w-full disabled:opacity-50"
                >
                  {loading === 'email' ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-text-dim text-xs mt-6">
          By signing in, you agree to our{' '}
          <a href="/terms" className="hover:text-text-muted transition-colors">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="hover:text-text-muted transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </main>
  )
}
