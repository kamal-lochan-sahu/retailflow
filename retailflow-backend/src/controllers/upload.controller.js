import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new Error('No file uploaded')
  res.json(new ApiResponse(200, { url: req.file.path, public_id: req.file.filename }, 'Uploaded'))
})
