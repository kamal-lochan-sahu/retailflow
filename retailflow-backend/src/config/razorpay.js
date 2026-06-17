import Razorpay from 'razorpay'
import crypto from 'crypto'

let instance = null
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  instance = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

export const createOrder = async (amount, currency = 'INR', receipt) => {
  if (!instance) throw new Error('Razorpay not configured')
  return instance.orders.create({ amount: amount * 100, currency, receipt })
}

export const verifySignature = (orderId, paymentId, signature) => {
  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return generated === signature
}

export default instance
