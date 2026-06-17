import { Router } from 'express'
import { getSettings, updateSettings } from '../controllers/settings.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { ownerOnly } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.get('/',  getSettings)
router.put('/',  ownerOnly, updateSettings)
export default router
