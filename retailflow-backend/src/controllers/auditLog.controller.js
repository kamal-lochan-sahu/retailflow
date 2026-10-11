import AuditLog from '../models/AuditLog.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, model } = req.query
  const filter = { ownerId: req.scopeOwnerId }
  if (model) filter.model = model

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('deletedBy', 'name email')
      .lean(),
    AuditLog.countDocuments(filter)
  ])

  res.json(new ApiResponse(200, {
    logs,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
  }))
})
