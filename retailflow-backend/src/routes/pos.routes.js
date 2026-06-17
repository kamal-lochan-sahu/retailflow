import { Router } from 'express'
import { createSale, getDailySummary } from '../controllers/sale.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { cashierUp } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.post('/checkout', cashierUp, createSale)
router.get( '/summary',  getDailySummary)
export default router
