import { Router } from 'express'
import { getCustomers, getCustomer, createCustomer, updateCustomer,
         searchCustomers, getCustomerHistory, getDefaulters, sendReminder } from '../controllers/customer.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validateUpdate } from '../middleware/validate.middleware.js'
import { updateCustomerSchema } from '../validators/update.validator.js'

const router = Router()
router.use(authenticate)
router.get( '/search',         searchCustomers)
router.get( '/defaulters',     getDefaulters)
router.get( '/',               getCustomers)
router.post('/',               createCustomer)
router.get( '/:id',            getCustomer)
router.put( '/:id',            validateUpdate(updateCustomerSchema), updateCustomer)
router.get( '/:id/history',    getCustomerHistory)
router.post('/:id/remind',     sendReminder)
export default router
