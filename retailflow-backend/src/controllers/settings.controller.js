import Settings from '../models/Settings.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { delCache } from '../config/redis.js'

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ ownerId: req.scopeOwnerId })
  if (!settings) settings = await Settings.create({ ownerId: req.scopeOwnerId })
  res.json(new ApiResponse(200, settings))
})

// { shop: { name: 'x' } } -> { 'shop.name': 'x' }. A plain $set of a nested object REPLACES the whole
// object, so saving the settings form used to wipe every sibling field it didn't send (e.g. shop.logo).
const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) flatten(v, key, out)
    else out[key] = v
  }
  return out
}

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { ownerId: req.scopeOwnerId },
    { $set: flatten(req.body) },
    { new: true, upsert: true }
  )
  await delCache(`dashboard:${req.scopeOwnerId}`)
  res.json(new ApiResponse(200, settings, 'Settings updated'))
})
