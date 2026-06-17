import { Router } from 'express'
import { getPurchases, createPurchase, receivePurchase } from '../controllers/purchase.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.get( '/',              getPurchases)
router.post('/',              managerUp, createPurchase)
router.post('/:id/receive',   managerUp, receivePurchase)
export default router
