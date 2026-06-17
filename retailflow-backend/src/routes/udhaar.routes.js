import { Router } from 'express'
import { getCustomerLedger, recordPayment, getUdhaarReport } from '../controllers/udhaar.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = Router()
router.use(authenticate)
router.get( '/customer/:customerId', getCustomerLedger)
router.post('/payment',              recordPayment)
router.get( '/report',               getUdhaarReport)
export default router
