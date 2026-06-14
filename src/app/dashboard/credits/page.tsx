'use client'
import { useEffect, useState } from 'react'
import { useSearchParams }     from 'next/navigation'
import { CREDIT_PACKS }        from '@/config/pricing'
import { Suspense } from 'react'

interface Payment {
  id:               string
  creditsPurchased: number
  amountCents:      number
  currency:         string
  status:           string
  createdAt:        string
}

function CreditsContent() {
  const searchParams           = useSearchParams()
  const [credits, setCredits]  = useState<number | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [toast, setToast]      = useState<string | null>(null)
  const [buying, setBuying]    = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('success') === 'true') setToast('Payment successful! Credits added.')
    if (searchParams.get('cancelled') === 'true') setToast('Payment cancelled.')
  }, [searchParams])

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(() => {
        // Credits come from session; do a lightweight session fetch
        fetch('/api/auth/session')
          .then(r => r.json())
          .then(s => setCredits(s?.user?.credits ?? 0))
      })
    fetch('/api/payments')
      .then(r => r.json())
      .then(d => setPayments(d.payments ?? []))
  }, [])

  const handleBuy = async (packId: string) => {
    setBuying(packId)
    const res  = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ packId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { setToast(data.error ?? 'Checkout failed'); setBuying(null) }
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 card px-5 py-3 text-sm font-medium z-50 border shadow-glow
          ${toast.includes('successful') ? 'text-green border-green/30' : 'text-red border-red/30'}`}>
          {toast}
          <button onClick={() => setToast(null)} className="ml-4 text-text-dim hover:text-text-primary">×</button>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-text-primary">Credits</h1>
        <p className="text-text-muted mt-1">1 credit per PDF page processed</p>
      </div>

      {/* Balance */}
      <div className="card p-8 flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan/10 border border-cyan/20
                        flex items-center justify-center text-3xl">
          ⚡
        </div>
        <div>
          <p className="text-5xl font-bold text-cyan">{credits ?? '—'}</p>
          <p className="text-text-muted mt-1">credits remaining</p>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-3 gap-4">
        {CREDIT_PACKS.map(pack => (
          <div
            key={pack.id}
            className={`card p-6 flex flex-col relative transition-all ${
              pack.highlight
                ? 'border-cyan/40 shadow-glow'
                : 'hover:border-cyan/20'
            }`}
          >
            {pack.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2
                               bg-cyan text-background text-xs font-semibold
                               px-3 py-0.5 rounded-full">
                Most popular
              </span>
            )}
            <p className="text-xl font-bold text-text-primary">{pack.name}</p>
            <p className="text-4xl font-bold text-cyan mt-2">${pack.priceUsd}</p>
            <p className="text-text-muted text-sm mt-1">{pack.credits} credits</p>
            <p className="text-text-dim text-xs mt-0.5">
              ${(pack.priceUsd / pack.credits).toFixed(2)} / credit
            </p>
            <button
              onClick={() => handleBuy(pack.id)}
              disabled={!!buying}
              className="btn-primary mt-6 disabled:opacity-60"
            >
              {buying === pack.id ? 'Opening…' : 'Buy'}
            </button>
          </div>
        ))}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Payment history</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-text-dim text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Credits</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-text-muted">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-text-primary">+{p.creditsPurchased}</td>
                    <td className="px-6 py-4 text-text-primary">
                      ${(p.amountCents / 100).toFixed(2)} {p.currency.toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-green text-xs capitalize">{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreditsPage() {
  return (
    <Suspense>
      <CreditsContent />
    </Suspense>
  )
}
