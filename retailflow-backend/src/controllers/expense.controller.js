import Expense from '../models/Expense.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const filter = { ownerId: req.user._id }
  const skip   = (parseInt(page) - 1) * parseInt(limit)

  const [expenses, total, totalAmountAgg] = await Promise.all([
    Expense.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, sum: { $sum: '$amount' } } }])
  ])

  res.json(new ApiResponse(200, {
    expenses,
    totalAmount: totalAmountAgg[0]?.sum || 0,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
  }))
})

export const getOne = asyncHandler(async (req, res) => {
  const item = await Expense.findOne({ _id: req.params.id, ownerId: req.user._id})
  if (!item) throw new ApiError(404, 'Expense not found')
  res.json(new ApiResponse(200, item))
})

export const create = asyncHandler(async (req, res) => {
  const item = await Expense.create({ ...req.body, ownerId: req.user._id})
  res.status(201).json(new ApiResponse(201, item, 'Expense created'))
})

export const update = asyncHandler(async (req, res) => {
  const item = await Expense.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id},
    req.body, { new: true}
  )
  if (!item) throw new ApiError(404, 'Expense not found')
  res.json(new ApiResponse(200, item, 'Expense updated'))
})

export const remove = asyncHandler(async (req, res) => {
  const item = await Expense.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id})
  if (!item) throw new ApiError(404, 'Expense not found')
  res.json(new ApiResponse(200, {}, 'Expense deleted'))
})
