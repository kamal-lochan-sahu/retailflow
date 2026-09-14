import Supplier from '../models/Supplier.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getAll = asyncHandler(async (req, res) => {
  const filter = { ownerId: req.user._id }
  const items  = await Supplier.find(filter).sort({ createdAt: -1}).lean()
  res.json(new ApiResponse(200, items))
})

export const getOne = asyncHandler(async (req, res) => {
  const item = await Supplier.findOne({ _id: req.params.id, ownerId: req.user._id})
  if (!item) throw new ApiError(404, 'Supplier not found')
  res.json(new ApiResponse(200, item))
})

export const create = asyncHandler(async (req, res) => {
  const item = await Supplier.create({ ...req.body, ownerId: req.user._id})
  res.status(201).json(new ApiResponse(201, item, 'Supplier created'))
})

export const update = asyncHandler(async (req, res) => {
  const item = await Supplier.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id},
    req.body, { new: true}
  )
  if (!item) throw new ApiError(404, 'Supplier not found')
  res.json(new ApiResponse(200, item, 'Supplier updated'))
})

export const remove = asyncHandler(async (req, res) => {
  const item = await Supplier.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id})
  if (!item) throw new ApiError(404, 'Supplier not found')
  res.json(new ApiResponse(200, {}, 'Supplier deleted'))
})
