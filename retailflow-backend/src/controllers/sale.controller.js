import Sale from '../models/Sale.js'
import Product from '../models/Product.js'
import Customer from '../models/Customer.js'
import UdhaarLedger from '../models/UdhaarLedger.js'
import Settings from '../models/Settings.js'
import ProductVariant from '../models/ProductVariant.js'
import { posRuleViolations, discountOverflow } from '../utils/posRules.utils.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateBillNumber } from '../utils/billNumber.utils.js'
import SaleReturn from '../models/SaleReturn.js'
import { createBillPDF } from '../utils/pdf.utils.js'
import { sendBillWhatsApp } from '../utils/whatsapp.utils.js'
import { io } from '../../server.js'
import dayjs from 'dayjs'

// Used by createSale and syncOfflineSale to make retries safe (see Sale.clientId).
const findSaleByClientId = (ownerId, clientId) =>
  Sale.findOne({ ownerId, clientId })
    .populate('customerId', 'name phone')
    .populate('staffId', 'name')

// Reference price of each cart line (variant price when it has one, else the product's) -> rule check input.
const buildRuleLines = async (ownerId, items, productMap) => {
  const vIds = items.map(i => i.variantId).filter(Boolean)
  const variants = vIds.length ? await ProductVariant.find({ _id: { $in: vIds }, ownerId }).select('sellingPrice').lean() : []
  const vMap = new Map(variants.map(v => [v._id.toString(), v]))
  return items.map(i => {
    const p = productMap.get(i.productId.toString())
    const ref = (i.variantId && vMap.get(String(i.variantId))?.sellingPrice) || p.sellingPrice
    return {
      name: p.name, refPrice: ref, sellingPrice: i.sellingPrice || ref, quantity: i.quantity,
      discount: i.discount || 0, discountType: i.discountType || 'flat',
    }
  })
}
const billSubtotal = (lines) => lines.reduce((s, l) => {
  const gross = l.sellingPrice * l.quantity
  return s + gross - (l.discountType === 'percent' ? gross * l.discount / 100 : l.discount)
}, 0)

// ── Create Sale ────────────────────────────────────────────────
export const createSale = asyncHandler(async (req, res) => {
  const ownerId = req.scopeOwnerId
  const {
    items, customerId, paymentMode, payments,
    discountAmount = 0, discountType = 'flat',
    notes, isGstBill = false, sendWhatsApp: sendWA = false,
    pointsRedeemed = 0, branchId, counterId, clientId
  } = req.body

  if (!items?.length) throw new ApiError(400, 'Items required')

  // Idempotency: if the response to an earlier attempt was lost (flaky signal), the
  // till retries with the same clientId — hand back the existing sale, don't re-bill.
  if (clientId) {
    const existing = await findSaleByClientId(ownerId, clientId)
    if (existing) return res.status(200).json(new ApiResponse(200, existing, 'Sale already recorded'))
  }

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

  // Price / discount rules (see Settings.pos). Online sale, so a breach is refused outright.
  {
    const lines = await buildRuleLines(ownerId, items, productMap)
    const bill  = { discountAmount, discountType, subtotal: billSubtotal(lines) }
    const overflow = discountOverflow({ lines, bill })
    if (overflow) throw new ApiError(400, overflow)
    const problems = posRuleViolations({ role: req.user.role, settings, lines, bill })
    if (problems.length) throw new ApiError(403, problems[0])
  }

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
    clientId: clientId || undefined,
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

// ── Sync an offline sale ───────────────────────────────────────
// A sale rung up with no connection: the goods have already left and the money is
// collected, so unlike createSale this never rejects for stock. It records the sale,
// lets stock go negative if it must, and flags the sale for the owner to review.
// Idempotent on clientId — replaying a queued sale can never bill twice.
export const syncOfflineSale = asyncHandler(async (req, res) => {
  const ownerId = req.scopeOwnerId
  const {
    items, customerId, paymentMode, payments,
    discountAmount = 0, discountType = 'flat',
    notes, isGstBill = false,
    pointsRedeemed = 0, branchId, counterId,
    clientId, offlineCreatedAt,
  } = req.body

  const existing = await findSaleByClientId(ownerId, clientId)
  if (existing) return res.status(200).json(new ApiResponse(200, existing, 'Already synced'))

  // Inactive (deleted since it was cached) products are still fine — the sale happened.
  const products   = await Product.find({ _id: { $in: items.map(i => i.productId) }, ownerId }).lean()
  const productMap = new Map(products.map(p => [p._id.toString(), p]))

  for (const item of items) {
    if (!productMap.has(item.productId.toString()))
      throw new ApiError(422, `Product no longer exists: ${item.productId}`)
  }

  const soldQty = new Map()
  for (const item of items) {
    const k = item.productId.toString()
    soldQty.set(k, (soldQty.get(k) || 0) + item.quantity)
  }
  const oversold = []
  for (const [k, qty] of soldQty) {
    const p = productMap.get(k)
    if (p.stock < qty) oversold.push(`${p.name} (had ${p.stock}, sold ${qty})`)
  }

  const settings = await Settings.findOne({ ownerId }).lean()

  // Already sold, so it can't be refused: record it, and flag it for the owner when it broke a rule.
  const ruleLines = await buildRuleLines(ownerId, items, productMap)
  const ruleBill  = { discountAmount, discountType, subtotal: billSubtotal(ruleLines) }
  const overflowMsg  = discountOverflow({ lines: ruleLines, bill: ruleBill })
  const ruleProblems = [
    ...(overflowMsg ? [overflowMsg] : []),
    ...posRuleViolations({ role: req.user.role, settings, lines: ruleLines, bill: ruleBill }),
  ]

  let subtotal = 0, gstAmount = 0
  const enrichedItems = items.map(item => {
    const product      = productMap.get(item.productId.toString())
    const sellingPrice = item.sellingPrice || product.sellingPrice
    const lineDiscount = item.discountType === 'percent'
      ? (sellingPrice * item.quantity * (item.discount || 0)) / 100
      : (item.discount || 0)
    const lineTotal = (sellingPrice * item.quantity) - lineDiscount
    const gst       = (lineTotal * product.gstPercent) / 100
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

  const appliedDiscount = discountType === 'percent' ? (subtotal * discountAmount) / 100 : discountAmount
  const totalAmount     = Math.round(subtotal - appliedDiscount + gstAmount)

  let creditAmount = 0
  if (paymentMode === 'credit') creditAmount = totalAmount
  else if (paymentMode === 'split' && payments)
    creditAmount = payments.find(p => p.mode === 'credit')?.amount || 0

  let pointsEarned = 0
  if (settings?.loyalty?.enabled && customerId)
    pointsEarned = Math.floor(totalAmount * (settings.loyalty.pointsPerRupee || 1))

  // The real, sequential bill number can only be assigned by the server — so it's
  // assigned now, at sync time. (The till showed a temporary OFF-xxxxxx reference.)
  const billNumber = await generateBillNumber(ownerId, settings?.billing?.prefix || 'INV')

  const sale = await Sale.create({
    ownerId, branchId, billNumber, counterId, clientId,
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
    isOffline: true,
    syncedAt: new Date(),
    createdAt: new Date(offlineCreatedAt),
    needsReview: oversold.length > 0 || ruleProblems.length > 0,
    reviewReason: [
      oversold.length ? `Sold offline with insufficient stock: ${oversold.join('; ')}` : '',
      ruleProblems.length ? `Price/discount rules: ${ruleProblems.join('; ')}` : '',
    ].filter(Boolean).join(' | ') || undefined,
  })

  // Unconditional deduction (no $gte guard): the goods are gone, the books must say so.
  await Product.bulkWrite(enrichedItems.map(item => ({
    updateOne: { filter: { _id: item.productId }, update: { $inc: { stock: -item.quantity } } }
  })), { ordered: false })

  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: {
        outstandingBalance: creditAmount,
        loyaltyPoints:      pointsEarned - pointsRedeemed,
        totalLoyaltyEarned: pointsEarned,
        totalPurchase:      totalAmount,
        visitCount:         1,
      },
      $set: { lastVisit: new Date(offlineCreatedAt) }
    })
  }

  if (creditAmount > 0 && customerId) {
    const updatedCustomer = await Customer.findById(customerId).select('outstandingBalance').lean()
    await UdhaarLedger.create({
      ownerId, customerId,
      type:    'credit',
      saleId:  sale._id,
      amount:  creditAmount,
      balance: updatedCustomer?.outstandingBalance || creditAmount,
      note:    `Sale ${billNumber} (offline)`,
      staffId: req.user._id,
    })
  }

  io.to(ownerId.toString()).emit('new_sale', {
    billNumber, totalAmount, paymentMode, items: enrichedItems.length
  })

  const populated = await Sale.findById(sale._id)
    .populate('customerId', 'name phone')
    .populate('staffId', 'name')
  res.status(201).json(new ApiResponse(201, populated, 'Offline sale synced'))
})

// ── List Sales ─────────────────────────────────────────────────
export const getSales = asyncHandler(async (req, res) => {
  const { page=1, limit=20, from, to, paymentMode, staffId, status='completed' } = req.query
  const filter = { ownerId: req.scopeOwnerId, status }

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
  const sale = await Sale.findOne({ _id: req.params.id, ownerId: req.scopeOwnerId })
    .populate('customerId','name phone address')
    .populate('staffId','name')
  if (!sale) throw new ApiError(404, 'Sale not found')
  res.json(new ApiResponse(200, sale))
})

export const voidSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, ownerId: req.scopeOwnerId })
  if (!sale) throw new ApiError(404, 'Sale not found')
  if (sale.status === 'void') throw new ApiError(400, 'Sale already voided')
  if (await SaleReturn.exists({ saleId: sale._id })) throw new ApiError(400, 'Sale has returns and cannot be voided')

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
  const sale = await Sale.findOne({ _id: req.params.id, ownerId: req.scopeOwnerId })
    .populate('customerId','name phone address')
  if (!sale) throw new ApiError(404, 'Sale not found')

  const settings = await Settings.findOne({ ownerId: req.scopeOwnerId })
  const pdf = await createBillPDF(sale.toObject(), settings?.toObject() || { shop: {} })

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `inline; filename="${sale.billNumber}.pdf"`,
    'Content-Length':      pdf.length,
  }).send(pdf)
})

export const getDailySummary = asyncHandler(async (req, res) => {
  const date  = req.query.date ? new Date(req.query.date) : new Date()
  const start = dayjs(date).startOf('day').toDate()
  const end   = dayjs(date).endOf('day').toDate()

  const [[summary], topItems] = await Promise.all([
    Sale.aggregate([
      { $match: { ownerId: req.scopeOwnerId, status:'completed', createdAt:{ $gte:start, $lte:end } } },
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
      { $match: { ownerId: req.scopeOwnerId, status:'completed', createdAt:{ $gte:start, $lte:end } } },
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
