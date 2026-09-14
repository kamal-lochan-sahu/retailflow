import Sale from '../models/Sale.js'
import Product from '../models/Product.js'
import Customer from '../models/Customer.js'
import UdhaarLedger from '../models/UdhaarLedger.js'
import Settings from '../models/Settings.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateBillNumber } from '../utils/billNumber.utils.js'
import { createBillPDF } from '../utils/pdf.utils.js'
import { sendBillWhatsApp } from '../utils/whatsapp.utils.js'
import { io } from '../../server.js'
import dayjs from 'dayjs'

// ── Create Sale ────────────────────────────────────────────────
export const createSale = asyncHandler(async (req, res) => {
  const ownerId = req.user._id
  const {
    items, customerId, paymentMode, payments,
    discountAmount = 0, discountType = 'flat',
    notes, isGstBill = false, sendWhatsApp: sendWA = false,
    pointsRedeemed = 0, branchId, counterId
  } = req.body

  if (!items?.length) throw new ApiError(400, 'Items required')

  // ── FIX: Fetch ALL products in ONE query (was N+1 loop) ────
  const productIds = items.map(i => i.productId)
  const products   = await Product.find({
    _id: { $in: productIds },
    ownerId,
    isActive: true,
  }).lean()

  const productMap = new Map(products.map(p => [p._id.toString(), p]))

  // Validate all products exist + stock
  for (const item of items) {
    const product = productMap.get(item.productId?.toString())
    if (!product) throw new ApiError(404, `Product not found: ${item.productId}`)
    if (product.stock < item.quantity)
      throw new ApiError(400, `Insufficient stock for "${product.name}": have ${product.stock}, need ${item.quantity}`)
  }

  const settings = await Settings.findOne({ ownerId }).lean()

  // Calculate totals
  let subtotal = 0, gstAmount = 0
  const enrichedItems = items.map(item => {
    const product = productMap.get(item.productId?.toString())
    const sellingPrice = item.sellingPrice || product.sellingPrice

    const lineDiscount = item.discountType === 'percent'
      ? (sellingPrice * item.quantity * (item.discount || 0)) / 100
      : (item.discount || 0)

    const lineTotal = (sellingPrice * item.quantity) - lineDiscount
    const gst = (lineTotal * product.gstPercent) / 100

    subtotal  += lineTotal
    gstAmount += gst

    return {
      productId:    product._id,
      variantId:    item.variantId || null,
      name:         product.name,
      sku:          product.sku,
      barcode:      product.barcode,
      unit:         product.unit,
      mrp:          product.mrp,
      sellingPrice,
      discount:     item.discount || 0,
      discountType: item.discountType || 'flat',
      gstPercent:   product.gstPercent,
      gstAmount:    Math.round(gst * 100) / 100,
      quantity:     item.quantity,
      total:        lineTotal,
    }
  })

  const appliedDiscount = discountType === 'percent'
    ? (subtotal * discountAmount) / 100
    : discountAmount

  const preTaxTotal = subtotal - appliedDiscount
  const totalAmount = Math.round(preTaxTotal + gstAmount)

  let creditAmount = 0
  if (paymentMode === 'credit') creditAmount = totalAmount
  else if (paymentMode === 'split' && payments)
    creditAmount = payments.find(p => p.mode === 'credit')?.amount || 0

  let pointsEarned = 0
  if (settings?.loyalty?.enabled && customerId)
    pointsEarned = Math.floor(totalAmount * (settings.loyalty.pointsPerRupee || 1))

  const billNumber = await generateBillNumber(ownerId, settings?.billing?.prefix || 'INV')

  const sale = await Sale.create({
    ownerId, branchId, billNumber, counterId,
    customerId: customerId || null,
    staffId: req.user._id,
    items: enrichedItems,
    subtotal: Math.round(subtotal),
    discountAmount: appliedDiscount,
    discountType,
    gstAmount: Math.round(gstAmount),
    roundOff: 0,
    totalAmount,
    paymentMode,
    payments: paymentMode === 'split' ? payments : [{ mode: paymentMode, amount: totalAmount }],
    creditAmount,
    paidAmount: totalAmount - creditAmount,
    pointsEarned,
    pointsRedeemed,
    notes,
    isGstBill,
    status: 'completed',
  })

  // ── FIX: Bulk stock deduction (was N+1 loop) ──────────────
  const bulkOps = enrichedItems.map(item => ({
    updateOne: {
      filter: {
        _id:   item.productId,
        stock: { $gte: item.quantity }, // atomic guard
      },
      update: { $inc: { stock: -item.quantity } }
    }
  }))
  const bulkResult = await Product.bulkWrite(bulkOps, { ordered: false })

  // If any stock update failed (race condition), void sale and throw
  if (bulkResult.modifiedCount < enrichedItems.length) {
    await Sale.findByIdAndUpdate(sale._id, { status: 'void' })
    throw new ApiError(409, 'Stock changed during checkout. Please retry.')
  }

  // ── FIX: Atomic udhaar update (was race condition) ─────────
  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: {
        outstandingBalance: creditAmount,
        loyaltyPoints:      pointsEarned - pointsRedeemed,
        totalLoyaltyEarned: pointsEarned,
        totalPurchase:      totalAmount,
        visitCount:         1,
      },
      $set: { lastVisit: new Date() }
    })
  }

  // Udhaar ledger — use $inc style balance (fetch after update for correct balance)
  if (creditAmount > 0 && customerId) {
    const updatedCustomer = await Customer.findById(customerId).select('outstandingBalance').lean()
    await UdhaarLedger.create({
      ownerId,
      customerId,
      type:    'credit',
      saleId:  sale._id,
      amount:  creditAmount,
      balance: updatedCustomer?.outstandingBalance || creditAmount,
      note:    `Sale ${billNumber}`,
      staffId: req.user._id,
    })
  }

  // Realtime emit
  io.to(ownerId.toString()).emit('new_sale', {
    billNumber, totalAmount, paymentMode, items: enrichedItems.length
  })

  // WhatsApp bill
  if (sendWA && customerId) {
    const customer = await Customer.findById(customerId).select('phone name').lean()
    if (customer?.phone) {
      await sendBillWhatsApp(customer.phone, {
        billNumber, items: enrichedItems, total: totalAmount,
        shopName: settings?.shop?.name || process.env.SHOP_NAME
      }).catch(() => {})
    }
  }

  const populated = await Sale.findById(sale._id)
    .populate('customerId', 'name phone')
    .populate('staffId', 'name')

  res.status(201).json(new ApiResponse(201, populated, 'Sale completed'))
})

// ── List Sales ─────────────────────────────────────────────────
export const getSales = asyncHandler(async (req, res) => {
  const { page=1, limit=20, from, to, paymentMode, staffId, status='completed' } = req.query
  const filter = { ownerId: req.user._id, status }

  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to)   filter.createdAt.$lte = dayjs(to).endOf('day').toDate()
  }
  if (paymentMode) filter.paymentMode = paymentMode
  if (staffId)     filter.staffId     = staffId

  const skip = (parseInt(page)-1) * parseInt(limit)
  const [sales, total, [agg]] = await Promise.all([
    Sale.find(filter)
      .populate('customerId','name phone')
      .populate('staffId','name')
      .sort({ createdAt: -1 })
      .skip(skip).limit(parseInt(limit))
      .lean(),
    Sale.countDocuments(filter),
    Sale.aggregate([
      { $match: filter },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ])
  ])

  res.json(new ApiResponse(200, {
    sales,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total/limit) },
    totalRevenue: agg?.revenue || 0
  }))
})

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, ownerId: req.user._id })
    .populate('customerId','name phone address')
    .populate('staffId','name')
  if (!sale) throw new ApiError(404, 'Sale not found')
  res.json(new ApiResponse(200, sale))
})

export const voidSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, ownerId: req.user._id })
  if (!sale) throw new ApiError(404, 'Sale not found')
  if (sale.status === 'void') throw new ApiError(400, 'Sale already voided')

  sale.status = 'void'
  await sale.save()

  // Restore stock atomically
  const restoreOps = sale.items.map(item => ({
    updateOne: {
      filter: { _id: item.productId },
      update: { $inc: { stock: item.quantity } }
    }
  }))
  await Product.bulkWrite(restoreOps)

  if (sale.creditAmount > 0 && sale.customerId) {
    await Customer.findByIdAndUpdate(sale.customerId, {
      $inc: { outstandingBalance: -sale.creditAmount }
    })
  }

  res.json(new ApiResponse(200, {}, 'Sale voided'))
})

export const getBill = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, ownerId: req.user._id })
    .populate('customerId','name phone address')
  if (!sale) throw new ApiError(404, 'Sale not found')

  const settings = await Settings.findOne({ ownerId: req.user._id })
  const pdf = await createBillPDF(sale.toObject(), settings?.toObject() || { shop: {} })

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `inline; filename="${sale.billNumber}.pdf"`,
    'Content-Length':      pdf.length,
    'Access-Control-Allow-Origin': '*',
  }).send(pdf)
})

export const getDailySummary = asyncHandler(async (req, res) => {
  const date  = req.query.date ? new Date(req.query.date) : new Date()
  const start = dayjs(date).startOf('day').toDate()
  const end   = dayjs(date).endOf('day').toDate()

  const [[summary], topItems] = await Promise.all([
    Sale.aggregate([
      { $match: { ownerId: req.user._id, status:'completed', createdAt:{ $gte:start, $lte:end } } },
      { $group: {
        _id:        null,
        totalSales: { $sum: '$totalAmount' },
        billCount:  { $sum: 1 },
        cash:       { $sum: { $cond: [{ $eq: ['$paymentMode','cash'] }, '$totalAmount', 0] } },
        upi:        { $sum: { $cond: [{ $eq: ['$paymentMode','upi']  }, '$totalAmount', 0] } },
        card:       { $sum: { $cond: [{ $eq: ['$paymentMode','card'] }, '$totalAmount', 0] } },
        credit:     { $sum: '$creditAmount' },
        avgBill:    { $avg: '$totalAmount' },
      }}
    ]),
    Sale.aggregate([
      { $match: { ownerId: req.user._id, status:'completed', createdAt:{ $gte:start, $lte:end } } },
      { $unwind: '$items' },
      { $group: { _id:'$items.productId', name:{$first:'$items.name'}, qty:{$sum:'$items.quantity'}, revenue:{$sum:'$items.total'} } },
      { $sort: { revenue:-1 } }, { $limit: 5 }
    ])
  ])

  res.json(new ApiResponse(200, {
    date: dayjs(date).format('YYYY-MM-DD'),
    ...(summary || { totalSales:0, billCount:0, cash:0, upi:0, card:0, credit:0 }),
    topItems
  }))
})
