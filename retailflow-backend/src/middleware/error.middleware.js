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
  if (err.name === 'MulterError') error = new ApiError(400, err.message)
  if (err.type === 'entity.too.large') error = new ApiError(413, 'Request body too large')
  if (err.type === 'entity.parse.failed') error = new ApiError(400, 'Malformed JSON body')

  const statusCode = error.statusCode || 500
  // Never leak internals (Mongo / library error text) for unexpected 500s in production.
  const message = (statusCode === 500 && process.env.NODE_ENV === 'production')
    ? 'Internal server error'
    : (error.message || 'Internal server error')

  if (process.env.NODE_ENV === 'development') console.error('❌', err)
  else if (statusCode >= 500) console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${statusCode}`, err.stack || err)

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
