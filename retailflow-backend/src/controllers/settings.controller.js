import Settings from '../models/Settings.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { delCache } from '../config/redis.js'

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ ownerId: req.scopeOwnerId })
  if (!settings) settings = await Settings.create({ ownerId: req.scopeOwnerId })
  res.json(new ApiResponse(200, settings))
})

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { ownerId: req.scopeOwnerId },
    { $set: req.body },
    { new: true, upsert: true }
  )
  await delCache(`dashboard:${req.scopeOwnerId}`)
  res.json(new ApiResponse(200, settings, 'Settings updated'))
})
