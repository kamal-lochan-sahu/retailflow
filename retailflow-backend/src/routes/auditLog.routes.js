import { Router } from 'express'
import { getLogs } from '../controllers/auditLog.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { ownerOnly } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.get('/', ownerOnly, getLogs)
export default router
