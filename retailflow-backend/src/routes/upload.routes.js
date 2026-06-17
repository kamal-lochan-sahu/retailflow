import { Router } from 'express'
import { uploadImage } from '../controllers/upload.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { upload } from '../config/cloudinary.js'

const router = Router()
router.post('/image', authenticate, upload.single('image'), uploadImage)
export default router
