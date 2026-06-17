import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import User from '../models/User.js'

export const authenticate = asyncHandler(async (req, _, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new ApiError(401, 'Access token required')

  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  const user = await User.findById(decoded._id).select('-password -refreshToken')
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid or expired token')

  req.user = user
  next()
})
