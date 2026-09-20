import SaleReturn from '../models/SaleReturn.js'
import Sale from '../models/Sale.js'
import Product from '../models/Product.js'
import Customer from '../models/Customer.js'
import UdhaarLedger from '../models/UdhaarLedger.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateBillNumber } from '../utils/billNumber.utils.js'

export const createReturn = asyncHandler(async (req, res) => {
  const { saleId, items, refundMode, notes } = req.body
  const sale = await Sale.findOne({ _id: saleId, ownerId: req.scopeOwnerId })
  if (!sale) throw new ApiError(404, 'Sale not found')
  if (sale.status === 'void') throw new ApiError(400, 'Cannot return voided sale')

  const totalAmount = items.reduce((s,i) => s + i.amount, 0)
  const returnNumber = await generateBillNumber(req.scopeOwnerId, 'RTN')

  const saleReturn = await SaleReturn.create({
    ownerId: req.scopeOwnerId,
    saleId, items, totalAmount, refundMode,
    staffId: req.user._id,
    returnNumber, notes
  })

  // Restore stock
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })
  }

  // Handle credit refund
  if (refundMode === 'credit' && sale.customerId) {
    await Customer.findByIdAndUpdate(sale.customerId, { $inc: { outstandingBalance: -totalAmount } })
    await UdhaarLedger.create({
      ownerId: req.scopeOwnerId,
      customerId: sale.customerId,
      type: 'payment',
      amount: totalAmount,
      balance: 0,
      note: `Return ${returnNumber}`,
      staffId: req.user._id,
    })
  }

  sale.status = 'return'
  await sale.save()

  res.status(201).json(new ApiResponse(201, saleReturn, 'Return processed'))
})

export const getReturns = asyncHandler(async (req, res) => {
  const returns = await SaleReturn.find({ ownerId: req.scopeOwnerId })
    .populate('saleId','billNumber').sort({ createdAt:-1 }).lean()
  res.json(new ApiResponse(200, returns))
})
