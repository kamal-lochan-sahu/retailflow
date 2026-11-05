import mongoose from 'mongoose'
import SaleReturn from '../models/SaleReturn.js'
import Sale from '../models/Sale.js'
import Product from '../models/Product.js'
import Customer from '../models/Customer.js'
import UdhaarLedger from '../models/UdhaarLedger.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateBillNumber } from '../utils/billNumber.utils.js'

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

// Per product: how many were sold on this bill, and what one unit cost the customer
// including GST (line total is ex-GST, gstAmount is stored separately).
const soldByProduct = (sale) => {
  const map = new Map()
  for (const line of sale.items || []) {
    const key = String(line.productId)
    const cur = map.get(key) || { name: line.name, qty: 0, gross: 0 }
    cur.qty += Number(line.quantity) || 0
    cur.gross += (Number(line.total) || 0) + (Number(line.gstAmount) || 0)
    map.set(key, cur)
  }
  return map
}

const returnedByProduct = async (saleId) => {
  const prior = await SaleReturn.find({ saleId }).lean()
  const map = new Map()
  for (const r of prior) for (const it of r.items || []) {
    const key = String(it.productId)
    map.set(key, (map.get(key) || 0) + (Number(it.quantity) || 0))
  }
  return map
}

export const createReturn = asyncHandler(async (req, res) => {
  const { saleId, items, notes } = req.body
  const refundMode = req.body.refundMode || 'cash'

  if (!mongoose.isValidObjectId(saleId)) throw new ApiError(400, 'Valid saleId is required')
  if (!Array.isArray(items) || !items.length) throw new ApiError(400, 'Select at least one item to return')
  if (!['cash', 'upi', 'credit'].includes(refundMode)) throw new ApiError(400, 'Invalid refund mode')

  const sale = await Sale.findOne({ _id: saleId, ownerId: req.scopeOwnerId })
  if (!sale) throw new ApiError(404, 'Sale not found')
  if (sale.status === 'void') throw new ApiError(400, 'Cannot return voided sale')
  if (sale.status === 'hold') throw new ApiError(400, 'Cannot return a held bill')
  if (refundMode === 'credit' && !sale.customerId) throw new ApiError(400, 'Credit refund needs a customer on the bill')

  const sold = soldByProduct(sale)
  const returned = await returnedByProduct(sale._id)

  // The refund amount is worked out here from the original bill — never taken from the client.
  const clean = []
  const seen = new Set()
  for (const it of items) {
    const key = String(it.productId)
    const qty = Number(it.quantity)
    if (seen.has(key)) throw new ApiError(400, 'Each product can appear only once in a return')
    seen.add(key)
    const line = sold.get(key)
    if (!line) throw new ApiError(400, 'An item in the return is not on this bill')
    if (!(qty > 0)) throw new ApiError(400, `Enter a quantity for "${line.name}"`)
    const left = line.qty - (returned.get(key) || 0)
    if (qty > left + 1e-9) throw new ApiError(400, `Cannot return ${qty} of "${line.name}" — only ${left} left to return`)
    clean.push({
      productId: it.productId,
      name: line.name,
      quantity: qty,
      amount: r2((line.gross / line.qty) * qty),
      reason: it.reason ? String(it.reason).slice(0, 200) : undefined,
    })
  }

  const totalAmount = r2(clean.reduce((s, i) => s + i.amount, 0))
  const returnNumber = await generateBillNumber(req.scopeOwnerId, 'RTN')

  const saleReturn = await SaleReturn.create({
    ownerId: req.scopeOwnerId,
    saleId, items: clean, totalAmount, refundMode,
    staffId: req.user._id,
    returnNumber, notes
  })

  // Restore stock
  await Product.bulkWrite(clean.map(item => ({
    updateOne: { filter: { _id: item.productId }, update: { $inc: { stock: item.quantity } } }
  })))

  // Handle credit refund
  if (refundMode === 'credit' && sale.customerId) {
    const cust = await Customer.findByIdAndUpdate(sale.customerId, { $inc: { outstandingBalance: -totalAmount } }, { new: true })
    await UdhaarLedger.create({
      ownerId: req.scopeOwnerId,
      customerId: sale.customerId,
      type: 'payment',
      amount: totalAmount,
      balance: cust?.outstandingBalance ?? 0,
      note: `Return ${returnNumber}`,
      staffId: req.user._id,
    })
  }

  // Whole bill returned -> mark it; a partial return leaves the sale 'completed'
  // (its returns are listed on the bill).
  const after = await returnedByProduct(sale._id)
  const everything = [...sold.entries()].every(([k, v]) => (after.get(k) || 0) >= v.qty - 1e-9)
  if (everything) { sale.status = 'return'; await sale.save() }

  res.status(201).json(new ApiResponse(201, saleReturn, 'Return processed'))
})

export const getReturns = asyncHandler(async (req, res) => {
  const filter = { ownerId: req.scopeOwnerId }
  if (req.query.saleId) {
    if (!mongoose.isValidObjectId(req.query.saleId)) throw new ApiError(400, 'Invalid saleId')
    filter.saleId = req.query.saleId
  }
  const returns = await SaleReturn.find(filter)
    .populate('saleId','billNumber').sort({ createdAt:-1 }).lean()
  res.json(new ApiResponse(200, returns))
})
