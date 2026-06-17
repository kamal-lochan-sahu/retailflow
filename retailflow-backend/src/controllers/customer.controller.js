import Customer from '../models/Customer.js'
import Sale from '../models/Sale.js'
import UdhaarLedger from '../models/UdhaarLedger.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendUdhaarReminder } from '../utils/whatsapp.utils.js'

export const getCustomers = asyncHandler(async (req, res) => {
  const { page=1, limit=20, search, type, blocked } = req.query
  const filter = { ownerId: req.user._id }
  if (type)    filter.type    = type
  if (blocked) filter.isBlocked = blocked === 'true'
  if (search)  filter.$text  = { $search: search }

  const skip = (parseInt(page)-1) * parseInt(limit)
  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ lastVisit: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Customer.countDocuments(filter)
  ])
  res.json(new ApiResponse(200, {
    customers,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total/limit) }
  }))
})

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, ownerId: req.user._id })
  if (!customer) throw new ApiError(404, 'Customer not found')
  res.json(new ApiResponse(200, customer))
})

export const createCustomer = asyncHandler(async (req, res) => {
  const existing = await Customer.findOne({ ownerId: req.user._id, phone: req.body.phone })
  if (existing) throw new ApiError(409, 'Customer with this phone already exists')
  const customer = await Customer.create({ ...req.body, ownerId: req.user._id })
  res.status(201).json(new ApiResponse(201, customer, 'Customer created'))
})

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    req.body, { new: true }
  )
  if (!customer) throw new ApiError(404, 'Customer not found')
  res.json(new ApiResponse(200, customer, 'Customer updated'))
})

export const searchCustomers = asyncHandler(async (req, res) => {
  const { q } = req.query
  if (!q) return res.json(new ApiResponse(200, []))
  const customers = await Customer.find({
    ownerId: req.user._id,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { phone: { $regex: q } },
      { memberCardNumber: q }
    ]
  }).limit(10).lean()
  res.json(new ApiResponse(200, customers))
})

export const getCustomerHistory = asyncHandler(async (req, res) => {
  const { page=1, limit=10 } = req.query
  const skip = (parseInt(page)-1) * parseInt(limit)
  const [sales, total] = await Promise.all([
    Sale.find({ customerId: req.params.id, ownerId: req.user._id, status: 'completed' })
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Sale.countDocuments({ customerId: req.params.id, ownerId: req.user._id, status: 'completed' })
  ])
  res.json(new ApiResponse(200, { sales, pagination: { total, page: parseInt(page), pages: Math.ceil(total/limit) } }))
})

export const getDefaulters = asyncHandler(async (req, res) => {
  const customers = await Customer.find({
    ownerId: req.user._id, outstandingBalance: { $gt: 0 }
  }).sort({ outstandingBalance: -1 }).lean()
  const total = customers.reduce((s,c) => s + c.outstandingBalance, 0)
  res.json(new ApiResponse(200, { customers, total, count: customers.length }))
})

export const sendReminder = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, ownerId: req.user._id })
  if (!customer) throw new ApiError(404, 'Customer not found')
  if (!customer.phone) throw new ApiError(400, 'Customer has no phone number')
  await sendUdhaarReminder(
    customer.phone, customer.name,
    customer.outstandingBalance,
    process.env.SHOP_NAME
  )
  res.json(new ApiResponse(200, {}, 'Reminder sent'))
})
