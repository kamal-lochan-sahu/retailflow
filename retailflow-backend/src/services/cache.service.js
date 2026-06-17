import { getCache, setCache, delCache } from '../config/redis.js'
export const cache = { get: getCache, set: setCache, del: delCache }
