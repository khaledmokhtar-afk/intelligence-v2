import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' as const })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object
    const { userId, creditsPurchased } = checkoutSession.metadata ?? {}
    if (userId && creditsPurchased) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data:  { credits: { increment: parseInt(creditsPurchased) } },
        }),
        prisma.payment.create({
          data: {
            userId,
            stripeSessionId:  checkoutSession.id,
            stripePriceId:    '',
            creditsPurchased: parseInt(creditsPurchased),
            amountCents:      checkoutSession.amount_total ?? 0,
            currency:         checkoutSession.currency ?? 'usd',
            status:           'complete',
          },
        }),
      ])
    }
  }

  return NextResponse.json({ received: true })
}
