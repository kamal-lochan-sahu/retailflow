import { Router } from 'express'
import { getSettings, updateSettings } from '../controllers/settings.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { ownerOnly } from '../middleware/role.middleware.js'
import { validateUpdate } from '../middleware/validate.middleware.js'
import { updateSettingsSchema } from '../validators/update.validator.js'

const router = Router()
router.use(authenticate)
router.get('/',  getSettings)
router.put('/',  ownerOnly, validateUpdate(updateSettingsSchema), updateSettings)
export default router
