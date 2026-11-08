import { Router } from 'express'
import {
  register, login, logout, refreshToken,
  getMe, forgotPassword, resetPassword, changePassword, registrationStatus
} from '../controllers/auth.controller.js'
import { authenticate }  from '../middleware/auth.middleware.js'
import { authRateLimit } from '../middleware/rateLimit.middleware.js'
import { validate }      from '../middleware/validate.middleware.js'
import { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator.js'

const router = Router()

router.get( '/registration-status',                                                    registrationStatus)
router.post('/register',        authRateLimit, validate(registerSchema),      register)
router.post('/login',           authRateLimit, validate(loginSchema),          login)
router.post('/logout',                                                         logout)
router.post('/refresh-token',   refreshToken)
router.get( '/me',              authenticate,                                  getMe)
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password/:token', authRateLimit, validate(resetPasswordSchema), resetPassword)
router.post('/change-password', authenticate, authRateLimit, validate(changePasswordSchema), changePassword)

export default router
