import { Router } from 'express'
import { getAll, getOne, create, update, remove } from '../controllers/supplier.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp, ownerOnly } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.get( '/',    getAll)
router.post('/',    managerUp, create)
router.get( '/:id', getOne)
router.put( '/:id', managerUp, update)
router.delete('/:id', ownerOnly, remove)
export default router
