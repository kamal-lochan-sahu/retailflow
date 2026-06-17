import dayjs from 'dayjs'
import { redisClient } from '../config/redis.js'
import Settings from '../models/Settings.js'

export const generateBillNumber = async (ownerId, prefix = 'INV') => {
  const date    = dayjs().format('YYYYMMDD')
  const key     = `bill:${ownerId}:${date}`

  let seq
  if (redisClient) {
    seq = await redisClient.incr(key)
    await redisClient.expire(key, 86400 * 2)
  } else {
    // fallback: timestamp-based unique
    seq = Date.now() % 100000
  }

  return `${prefix}-${date}-${String(seq).padStart(4, '0')}`
}
