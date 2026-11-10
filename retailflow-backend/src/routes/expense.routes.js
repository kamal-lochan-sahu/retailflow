import { Router } from 'express'
import { getAll, getOne, create, update, remove } from '../controllers/expense.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp, ownerOnly } from '../middleware/role.middleware.js'
import { validateUpdate } from '../middleware/validate.middleware.js'
import { updateExpenseSchema } from '../validators/update.validator.js'

const router = Router()
router.use(authenticate)
router.get( '/',    managerUp, getAll)
router.post('/',    managerUp, create)
router.get( '/:id', managerUp, getOne)
router.put( '/:id', managerUp, validateUpdate(updateExpenseSchema), update)
router.delete('/:id', ownerOnly, remove)
export default router
