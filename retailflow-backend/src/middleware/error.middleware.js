import { ApiError } from '../utils/ApiError.js'

export const errorHandler = (err, req, res, next) => {
  let error = err

  if (err.name === 'CastError') error = new ApiError(400, `Invalid ${err.path}: ${err.value}`)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    error = new ApiError(400, `${field} already exists`)
  }
  if (err.name === 'ValidationError')
    error = new ApiError(400, Object.values(err.errors).map(e => e.message).join(', '))
  if (err.name === 'JsonWebTokenError') error = new ApiError(401, 'Invalid token')
  if (err.name === 'TokenExpiredError') error = new ApiError(401, 'Token expired')

  const statusCode = error.statusCode || 500
  const message    = error.message    || 'Internal server error'

  if (process.env.NODE_ENV === 'development') console.error('❌', err)

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
