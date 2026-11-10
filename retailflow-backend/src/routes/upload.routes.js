import { Router } from 'express'
import { uploadImage } from '../controllers/upload.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { upload } from '../config/cloudinary.js'
import { managerUp } from '../middleware/role.middleware.js'

const router = Router()
router.post('/image', authenticate, managerUp, upload.single('image'), uploadImage)  // only product screens upload
export default router
