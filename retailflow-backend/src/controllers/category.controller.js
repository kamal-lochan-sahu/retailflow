import Category from '../models/Category.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { logDeletion } from '../utils/auditLog.utils.js'

export const getAll = asyncHandler(async (req, res) => {
  const filter = { ownerId: req.scopeOwnerId, isDeleted: { $ne: true } }
  const items  = await Category.find(filter).sort({ createdAt: -1}).lean()
  res.json(new ApiResponse(200, items))
})

export const getOne = asyncHandler(async (req, res) => {
  const item = await Category.findOne({ _id: req.params.id, ownerId: req.scopeOwnerId, isDeleted: { $ne: true } })
  if (!item) throw new ApiError(404, 'Category not found')
  res.json(new ApiResponse(200, item))
})

export const create = asyncHandler(async (req, res) => {
  const item = await Category.create({ ...req.body, ownerId: req.scopeOwnerId})
  res.status(201).json(new ApiResponse(201, item, 'Category created'))
})

export const update = asyncHandler(async (req, res) => {
  const item = await Category.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.scopeOwnerId, isDeleted: { $ne: true } },
    req.body, { new: true}
  )
  if (!item) throw new ApiError(404, 'Category not found')
  res.json(new ApiResponse(200, item, 'Category updated'))
})

export const remove = asyncHandler(async (req, res) => {
  const item = await Category.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.scopeOwnerId, isDeleted: { $ne: true } },
    { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id },
    { new: true }
  )
  if (!item) throw new ApiError(404, 'Category not found')
  await logDeletion(req, 'Category', item)
  res.json(new ApiResponse(200, {}, 'Category deleted'))
})
