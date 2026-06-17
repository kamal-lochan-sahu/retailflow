import { Router } from 'express'
import { paySalary, getSalaryHistory } from '../controllers/salary.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { managerUp } from '../middleware/role.middleware.js'

const router = Router()
router.use(authenticate)
router.post('/',                     managerUp, paySalary)
router.get('/staff/:staffId/history',getSalaryHistory)
export default router
