import Sale from '../models/Sale.js'
import Product from '../models/Product.js'
import Customer from '../models/Customer.js'
import UdhaarLedger from '../models/UdhaarLedger.js'
import ProductBatch from '../models/ProductBatch.js'
import Settings from '../models/Settings.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateBillNumber } from '../utils/billNumber.utils.js'
import { createBillPDF } from '../utils/pdf.utils.js'
import { sendBillWhatsApp } from '../utils/whatsapp.utils.js'
import { io } from '../../server.js'
import dayjs from 'dayjs'

// ── Create Sale (Core POS action) ──────────────────────────────
export const createSale = asyncHandler(async (req, res) => {
  const ownerId = req.user._id
  const {
    items, customerId, paymentMode, payments,
    discountAmount = 0, discountType = 'flat',
    notes, isGstBill = false, sendWhatsApp: sendWA = false,
    pointsRedeemed = 0, branchId, counterId
  } = req.body

  if (!items?.length) throw new ApiError(400, 'Items required')

  const settings = await Settings.findOne({ ownerId })

  // Calculate totals & validate stock
  let subtotal = 0, gstAmount = 0

  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, ownerId, isActive: true })
    if (!product) throw new ApiError(404, `Product ${item.productId} not found`)
    if (product.stock < item.quantity) throw new ApiError(400, `Insufficient stock for ${product.name}: have ${product.stock}, need ${item.quantity}`)

    item.name         = product.name
    item.sku          = product.sku
    item.barcode      = product.barcode
    item.unit         = product.unit
    item.mrp          = product.mrp
    item.sellingPrice = item.sellingPrice || product.sellingPrice
    item.gstPercent   = product.gstPercent
    item.discountType = item.discountType || 'flat'

    const lineDiscount = item.discountType === 'percent'
      ? (item.sellingPrice * item.quantity * item.discount) / 100
      : (item.discount || 0)

    const lineTotal    = (item.sellingPrice * item.quantity) - lineDiscount
    const gst          = process.env.GST_BILLING === 'true' ? (lineTotal * product.gstPercent) / 100 : 0

    item.total         = lineTotal
    item.gstAmount     = gst
    subtotal          += lineTotal
    gstAmount         += gst
  }

  // Apply bill-level discount
  const appliedDiscount = discountType === 'percent'
    ? (subtotal * discountAmount) / 100
    : discountAmount

  const preTaxTotal  = subtotal - appliedDiscount
  const totalAmount  = Math.round(preTaxTotal + gstAmount)
  const roundOff     = totalAmount - (preTaxTotal + gstAmount)

  // Payment handling
  let creditAmount = 0
  if (paymentMode === 'credit') {
    creditAmount = totalAmount
  } else if (paymentMode === 'split' && payments) {
    creditAmount = payments.find(p => p.mode === 'credit')?.amount || 0
  }

  // Loyalty points
  let pointsEarned = 0
  if (settings?.loyalty?.enabled && customerId) {
    pointsEarned = Math.floor(totalAmount * (settings.loyalty.pointsPerRupee || 1))
  }

  const billNumber = await generateBillNumber(ownerId, settings?.billing?.prefix || 'INV')

  const sale = await Sale.create({
    ownerId, branchId, billNumber, counterId,
    customerId: customerId || null,
    staffId: req.user._id,
    items, subtotal, discountAmount: appliedDiscount, discountType,
    gstAmount, roundOff, totalAmount,
    paymentMode, payments: paymentMode === 'split' ? payments : [{ mode: paymentMode, amount: totalAmount }],
    creditAmount, paidAmount: totalAmount - creditAmount,
    pointsEarned, pointsRedeemed,
    notes, isGstBill, status: 'completed'
  })

  // ── Side effects ──────────────────────────────────────────────
  // 1. Deduct stock
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } })
  }

  // 2. Update customer
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

  // 3. Udhaar ledger entry
  if (creditAmount > 0 && customerId) {
    const customer    = await Customer.findById(customerId)
    const prevBalance = customer?.outstandingBalance - creditAmount || creditAmount
    await UdhaarLedger.create({
      ownerId, customerId,
      type: 'credit',
      saleId: sale._id,
      amount: creditAmount,
      balance: prevBalance + creditAmount,
      note: `Sale ${billNumber}`,
      staffId: req.user._id,
    })
  }

  // 4. Emit to POS clients (realtime)
  io.to(ownerId.toString()).emit('new_sale', {
    billNumber, totalAmount, paymentMode, items: items.length
  })

  // 5. WhatsApp bill
  const customer = customerId ? await Customer.findById(customerId) : null
  if (sendWA && customer?.phone) {
    await sendBillWhatsApp(customer.phone, {
      billNumber, items, total: totalAmount,
      shopName: settings?.shop?.name || process.env.SHOP_NAME
    }).catch(() => {})
  }

  const populated = await Sale.findById(sale._id)
    .populate('customerId','name phone')
    .populate('staffId','name')

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
  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate('customerId','name phone')
      .populate('staffId','name')
      .sort({ createdAt: -1 })
      .skip(skip).limit(parseInt(limit))
      .lean(),
    Sale.countDocuments(filter)
  ])

  const totalRevenue = await Sale.aggregate([
    { $match: filter },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
  ])

  res.json(new ApiResponse(200, {
    sales,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total/limit) },
    totalRevenue: totalRevenue[0]?.revenue || 0
  }))
})

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, ownerId: req.user._id })
    .populate('customerId','name phone address')
    .populate('staffId','name')
    .populate('items.productId','name sku images')
  if (!sale) throw new ApiError(404, 'Sale not found')
  res.json(new ApiResponse(200, sale))
})

export const voidSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, ownerId: req.user._id })
  if (!sale) throw new ApiError(404, 'Sale not found')
  if (sale.status === 'void') throw new ApiError(400, 'Sale already voided')

  sale.status = 'void'
  await sale.save()

  // Restore stock
  for (const item of sale.items) {
    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })
  }

  // Reverse udhaar if any
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
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${sale.billNumber}.pdf"`,
    'Content-Length': pdf.length,
  }).send(pdf)
})

export const getDailySummary = asyncHandler(async (req, res) => {
  const date  = req.query.date ? new Date(req.query.date) : new Date()
  const start = dayjs(date).startOf('day').toDate()
  const end   = dayjs(date).endOf('day').toDate()

  const [summary] = await Sale.aggregate([
    { $match: { ownerId: req.user._id, status: 'completed', createdAt: { $gte: start, $lte: end } } },
    { $group: {
      _id: null,
      totalSales:  { $sum: '$totalAmount' },
      billCount:   { $sum: 1 },
      cash:        { $sum: { $cond: [{ $eq: ['$paymentMode','cash'] }, '$totalAmount', 0] } },
      upi:         { $sum: { $cond: [{ $eq: ['$paymentMode','upi']  }, '$totalAmount', 0] } },
      card:        { $sum: { $cond: [{ $eq: ['$paymentMode','card'] }, '$totalAmount', 0] } },
      credit:      { $sum: '$creditAmount' },
      avgBill:     { $avg: '$totalAmount' },
    }}
  ])

  const topItems = await Sale.aggregate([
    { $match: { ownerId: req.user._id, status: 'completed', createdAt: { $gte: start, $lte: end } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', name: { $first: '$items.name' }, qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 }
  ])

  res.json(new ApiResponse(200, {
    date: dayjs(date).format('YYYY-MM-DD'),
    ...(summary || { totalSales:0, billCount:0, cash:0, upi:0, card:0, credit:0 }),
    topItems
  }))
})
