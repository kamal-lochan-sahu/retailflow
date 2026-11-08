import { Router } from 'express'
import { getOrders, updateOrderStatus, assignDelivery } from '../controllers/onlineOrder.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp } from '../middleware/role.middleware.js'
import { validateUpdate } from '../middleware/validate.middleware.js'
import { updateOrderStatusSchema, assignDeliverySchema } from '../validators/update.validator.js'

const router = Router()
router.use(authenticate)
router.get('/',                    getOrders)
router.put('/:id/status',          managerUp, validateUpdate(updateOrderStatusSchema), updateOrderStatus)
router.put('/:id/assign-delivery', managerUp, validateUpdate(assignDeliverySchema), assignDelivery)
export default router
