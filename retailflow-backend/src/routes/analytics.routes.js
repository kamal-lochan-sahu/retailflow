import { Router } from 'express'
import { getDashboard, getSalesAnalytics, getProfitReport, getGSTReport, exportReport } from '../controllers/analytics.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.get('/dashboard', getDashboard)
router.get('/sales',     getSalesAnalytics)
router.get('/profit',    managerUp, getProfitReport)
router.get('/gst',       managerUp, getGSTReport)
router.get('/export',    managerUp, exportReport)
export default router
