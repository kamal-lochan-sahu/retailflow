import Joi from 'joi'

export const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(50).required(),
  email:    Joi.string().email().required(),
  phone:    Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
  password: Joi.string().min(8).required(),
  shopName: Joi.string().optional(),
})

export const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
})

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword:     Joi.string().min(8).required(),
})
