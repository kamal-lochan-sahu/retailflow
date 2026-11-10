import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image selected')
  res.json(new ApiResponse(200, { url: req.file.path, public_id: req.file.filename }, 'Uploaded'))
})
