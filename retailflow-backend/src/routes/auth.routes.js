import { Router } from 'express'
import { register, login, logout, refreshToken, getMe, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authRateLimit } from '../middleware/rateLimit.middleware.js'

const router = Router()
router.post('/register',       authRateLimit, register)
router.post('/login',          authRateLimit, login)
router.post('/logout',         authenticate,  logout)
router.post('/refresh-token',  refreshToken)
router.get( '/me',             authenticate,  getMe)
router.post('/forgot-password',authRateLimit, forgotPassword)
router.post('/reset-password/:token', resetPassword)
router.post('/change-password', authenticate, changePassword)
export default router
