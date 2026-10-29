import { redisClient } from '../config/redis.js'
import Counter from '../models/Counter.js'

// Bill numbers look like INV-261030-0001 (prefix-YYMMDD-seq). That is 15 chars with a
// 3-letter prefix; GSTN accepts at most 16 characters for an invoice number.
// The date is the IST date (the server clock is UTC), and the sequence is atomic and
// never repeats: Redis INCR when available, otherwise a Mongo counter document.
const IST_MS = 19800000
const istDate = () => {
  const t = new Date(Date.now() + IST_MS)
  const p = (n) => String(n).padStart(2, '0')
  return `${String(t.getUTCFullYear()).slice(2)}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}`
}

export const generateBillNumber = async (ownerId, prefix = 'INV') => {
  const date = istDate()
  const key  = `bill:${ownerId}:${prefix}:${date}`

  let seq
  if (redisClient) {
    seq = await redisClient.incr(key)
    await redisClient.expire(key, 86400 * 2)
  } else {
    const c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true })
    seq = c.seq
  }

  return `${prefix}-${date}-${String(seq).padStart(4, '0')}`
}
