import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CREDIT_PACKS } from '@/config/pricing'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Must be signed in to purchase credits' }, { status: 401 })
  }

  const { packId } = await req.json()
  const pack = CREDIT_PACKS.find(p => p.id === packId)
  if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' as const })

  const checkout = await stripe.checkout.sessions.create({
    mode:       'payment',
    line_items: [{ price: pack.priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?success=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?cancelled=true`,
    metadata: {
      userId:           session.user.id,
      packId:           pack.id,
      creditsPurchased: pack.credits.toString(),
    },
    customer_email: session.user.email ?? undefined,
  })

  return NextResponse.json({ url: checkout.url })
}
