import { ApiError } from '../utils/ApiError.js'

export const authorize = (...roles) => (req, _, next) => {
  if (!roles.includes(req.user.role))
    throw new ApiError(403, `Access denied. Required: ${roles.join(' or ')}`)
  next()
}

// Specific role guards
export const ownerOnly    = authorize('owner')
export const managerUp    = authorize('owner', 'manager')
export const cashierUp    = authorize('owner', 'manager', 'cashier')
export const stockboyUp   = authorize('owner', 'manager', 'stockboy')
