import Sale from '../models/Sale.js'
import SaleReturn from '../models/SaleReturn.js'
import Product from '../models/Product.js'
import Settings from '../models/Settings.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { buildGstr1, periodRange, GSTIN_RE } from '../utils/gstr1.utils.js'

// GET /analytics/gstr1?month=10&year=2026
// Builds the GSTR-1 JSON (GST Offline Tool format) for one calendar month, IST.
export const getGSTR1 = asyncHandler(async (req, res) => {
  const month = parseInt(req.query.month, 10)
  const year  = parseInt(req.query.year, 10)
  if (!(month >= 1 && month <= 12) || !(year >= 2017 && year <= 2100)) {
    throw new ApiError(400, 'Valid month (1-12) and year are required')
  }

  const settings = await Settings.findOne({ ownerId: req.scopeOwnerId }).lean()
  const shopGstin = String(settings?.shop?.gstin || '').trim().toUpperCase()
  if (!GSTIN_RE.test(shopGstin)) {
    throw new ApiError(400, 'Set a valid shop GSTIN in Settings → Shop before generating GSTR-1')
  }

  const { start, end } = periodRange(month, year)
  const range = { $gte: start, $lt: end }

  const sales = await Sale.find({ ownerId: req.scopeOwnerId, status: { $in: ['completed', 'return', 'void'] }, createdAt: range })
    .populate('customerId', 'name gstin').sort({ createdAt: 1 }).lean()
  const returns = await SaleReturn.find({ ownerId: req.scopeOwnerId, createdAt: range }).sort({ createdAt: 1 }).lean()

  // Returns may belong to a sale from an earlier month — fetch those originals too.
  const origSalesById = {}
  for (const s of sales) origSalesById[String(s._id)] = s
  const missing = [...new Set(returns.map(r => String(r.saleId)))].filter(id => !origSalesById[id])
  if (missing.length) {
    const extra = await Sale.find({ ownerId: req.scopeOwnerId, _id: { $in: missing } }).populate('customerId', 'name gstin').lean()
    for (const s of extra) origSalesById[String(s._id)] = s
  }

  const ids = new Set()
  for (const s of Object.values(origSalesById)) for (const it of s.items || []) if (it.productId) ids.add(String(it.productId))
  const products = ids.size ? await Product.find({ ownerId: req.scopeOwnerId, _id: { $in: [...ids] } }).select('hsnCode unit gstPercent').lean() : []
  const productById = Object.fromEntries(products.map(p => [String(p._id), p]))

  const result = buildGstr1({ shopGstin, month, year, sales, returns, origSalesById, productById })
  res.json(new ApiResponse(200, { ...result, period: { month, year }, gstin: shopGstin }))
})
