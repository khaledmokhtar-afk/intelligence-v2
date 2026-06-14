export interface CreditPack {
  id:       string
  name:     string
  credits:  number
  priceUsd: number
  priceId:  string // Stripe Price ID
  highlight?: boolean
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id:       'starter',
    name:     'Starter',
    credits:  10,
    priceUsd: 9,
    priceId:  process.env.STRIPE_PRICE_STARTER ?? 'price_starter',
  },
  {
    id:        'pro',
    name:      'Pro',
    credits:   50,
    priceUsd:  39,
    priceId:   process.env.STRIPE_PRICE_PRO ?? 'price_pro',
    highlight: true,
  },
  {
    id:       'studio',
    name:     'Studio',
    credits:  200,
    priceUsd: 129,
    priceId:  process.env.STRIPE_PRICE_STUDIO ?? 'price_studio',
  },
]
