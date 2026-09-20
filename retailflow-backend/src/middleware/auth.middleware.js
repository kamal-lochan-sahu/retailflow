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

  // req.user is always the real, literal logged-in person — unchanged,
  // because it's returned as-is to the client (see getMe) and used for
  // self-account actions (logout, changePassword) and attribution fields
  // (Sale.staffId, Purchase.receivedBy, ...).
  //
  // req.scopeOwnerId is the separate, resolved id that every controller's
  // data query should filter/cache by ("which shop's data"). For an owner
  // it's their own id; for staff it's the shop they belong to. This is what
  // makes a staff login see the owner's products/customers/sales/etc.
  // without every controller needing its own staff-vs-owner branch.
  if (user.role === 'owner') {
    req.scopeOwnerId = user._id
  } else {
    if (!user.shopOwnerId) throw new ApiError(403, 'Staff account is not linked to a shop')
    req.scopeOwnerId = user.shopOwnerId
  }

  next()
})
