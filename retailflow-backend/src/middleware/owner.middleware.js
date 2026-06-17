import { ApiError } from '../utils/ApiError.js'

// Ensure the resource belongs to the logged-in owner (multi-tenant guard)
export const ownerGuard = (field = 'ownerId') => async (req, _, next) => {
  if (req.user.role !== 'owner') return next() // staff pass-through
  const resourceOwnerId = req.params.ownerId || req.body.ownerId
  if (resourceOwnerId && resourceOwnerId.toString() !== req.user._id.toString())
    throw new ApiError(403, 'Forbidden')
  next()
}
