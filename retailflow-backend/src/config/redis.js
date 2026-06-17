export let redisClient = null

export const connectRedis = async () => {
  const url = process.env.REDIS_URL
  if (!url || url === 'disabled' || url === '') {
    console.log('⚠️  Redis disabled — caching skipped')
    return
  }
  try {
    const { createClient } = await import('redis')
    redisClient = createClient({ url })
    redisClient.on('error', (err) => console.warn('Redis error:', err.message))
    await redisClient.connect()
    console.log('✅ Redis connected')
  } catch (err) {
    console.warn('⚠️  Redis unavailable — caching disabled')
    redisClient = null
  }
}

export const getCache = async () => null
export const setCache = async () => {}
export const delCache = async () => {}
