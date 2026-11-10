import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'
import { ApiError } from '../utils/ApiError.js'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'retailflow',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
  }
})

// Reject anything that isn't a JPG/PNG/WebP BEFORE it is streamed to Cloudinary
// (otherwise Cloudinary refuses it mid-upload and the client just sees a 500).
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const imageOnly = (_req, file, cb) =>
  ALLOWED_MIME.includes(file.mimetype) ? cb(null, true) : cb(new ApiError(400, 'Only JPG, PNG or WebP images are allowed'))

export const upload   = multer({ storage, fileFilter: imageOnly, limits: { fileSize: 5 * 1024 * 1024 } })
export default cloudinary
