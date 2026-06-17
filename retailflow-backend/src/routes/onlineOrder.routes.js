import { Router } from 'express'
import { getOrders, updateOrderStatus, assignDelivery } from '../controllers/onlineOrder.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.get('/',                    getOrders)
router.put('/:id/status',          managerUp, updateOrderStatus)
router.put('/:id/assign-delivery', managerUp, assignDelivery)
export default router
