import Stripe from 'stripe'

let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
}

export const createPaymentIntent = async (amount, currency = 'inr', metadata = {}) => {
  if (!stripe) throw new Error('Stripe not configured')
  return stripe.paymentIntents.create({ amount: amount * 100, currency, metadata })
}

export default stripe
