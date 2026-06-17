import { Router } from 'express'
import { createReturn, getReturns } from '../controllers/saleReturn.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.post('/', managerUp, createReturn)
router.get( '/', getReturns)
export default router
