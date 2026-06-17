import UdhaarLedger from '../models/UdhaarLedger.js'
import Customer from '../models/Customer.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getCustomerLedger = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.customerId, ownerId: req.user._id })
  if (!customer) throw new ApiError(404, 'Customer not found')

  const ledger = await UdhaarLedger.find({ customerId: req.params.customerId })
    .sort({ createdAt: -1 }).populate('saleId','billNumber totalAmount').lean()

  res.json(new ApiResponse(200, {
    customer: { name: customer.name, phone: customer.phone, outstanding: customer.outstandingBalance },
    ledger
  }))
})

export const recordPayment = asyncHandler(async (req, res) => {
  const { customerId, amount, paymentMode, note } = req.body

  const customer = await Customer.findOne({ _id: customerId, ownerId: req.user._id })
  if (!customer) throw new ApiError(404, 'Customer not found')
  if (amount > customer.outstandingBalance) throw new ApiError(400, 'Payment exceeds outstanding balance')

  const newBalance = customer.outstandingBalance - amount

  await Customer.findByIdAndUpdate(customerId, { outstandingBalance: newBalance })

  await UdhaarLedger.create({
    ownerId: req.user._id, customerId,
    type: 'payment',
    amount, balance: newBalance,
    note: note || `Payment received (${paymentMode})`,
    staffId: req.user._id,
    paymentMode
  })

  res.json(new ApiResponse(200, { newBalance }, 'Payment recorded'))
})

export const getUdhaarReport = asyncHandler(async (req, res) => {
  const defaulters = await Customer.find({
    ownerId: req.user._id,
    outstandingBalance: { $gt: 0 }
  }).sort({ outstandingBalance: -1 })

  const [agg] = await Customer.aggregate([
    { $match: { ownerId: req.user._id, outstandingBalance: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$outstandingBalance' }, count: { $sum: 1 } } }
  ])

  res.json(new ApiResponse(200, {
    customers: defaulters,
    totalOutstanding: agg?.total || 0,
    count: agg?.count || 0,
  }))
})
