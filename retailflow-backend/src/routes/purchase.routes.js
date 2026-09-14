import { Router } from 'express'
import { getPurchases, getPurchase, createPurchase, updatePurchase, receivePurchase } from '../controllers/purchase.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp }    from '../middleware/role.middleware.js'
import { validate }     from '../middleware/validate.middleware.js'
import { createPurchaseSchema } from '../validators/purchase.validator.js'

const router = Router()
router.use(authenticate)
router.get( '/',              getPurchases)
router.post('/',              managerUp, validate(createPurchaseSchema), createPurchase)
router.get( '/:id',           getPurchase)
router.put( '/:id',           managerUp, updatePurchase)
router.post('/:id/receive',   managerUp, receivePurchase)
export default router
