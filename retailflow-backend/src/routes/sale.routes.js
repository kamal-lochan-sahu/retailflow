import { Router } from 'express'
import { createSale, getSales, getSale, voidSale, getBill, getDailySummary } from '../controllers/sale.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp, cashierUp } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.post('/',           cashierUp, createSale)
router.get( '/',           getSales)
router.get( '/summary',    getDailySummary)
router.get( '/:id',        getSale)
router.get( '/:id/bill',   getBill)
router.put( '/:id/void',   managerUp, voidSale)
export default router
