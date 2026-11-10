import { ApiError } from '../utils/ApiError.js'

// Create endpoints: checks the body only (existing behaviour, left as is).
export const validate = (schema) => (req, _, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false })
  if (error) {
    const msg = error.details.map(d => d.message).join(', ')
    throw new ApiError(400, msg)
  }
  next()
}

// Update endpoints: checks AND replaces req.body with the cleaned value — unknown keys are
// stripped, strings trimmed / numbers coerced as the schema says. Because update schemas have
// no defaults, nothing the client didn't send ends up in the write.
export const validateUpdate = (schema) => (req, _, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
  if (error) {
    const msg = error.details.map(d => d.message).join(', ')
    throw new ApiError(400, msg)
  }
  req.body = value
  next()
}

// Same behaviour for create endpoints whose controllers spread req.body into a model.
export const validateStrict = validateUpdate
