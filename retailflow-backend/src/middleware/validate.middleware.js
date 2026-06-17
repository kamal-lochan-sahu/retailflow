import { ApiError } from '../utils/ApiError.js'

export const validate = (schema) => (req, _, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false })
  if (error) {
    const msg = error.details.map(d => d.message).join(', ')
    throw new ApiError(400, msg)
  }
  next()
}
