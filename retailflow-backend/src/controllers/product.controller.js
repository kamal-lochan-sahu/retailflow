import Product from '../models/Product.js'
import ProductVariant from '../models/ProductVariant.js'
import ProductBatch from '../models/ProductBatch.js'
import Category from '../models/Category.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getCache, setCache, delCache } from '../config/redis.js'
import csv from 'csv-parser'
import { Readable } from 'stream'

export const getProducts = asyncHandler(async (req, res) => {
  const { page=1, limit=20, category, search, minStock, status, sortBy='createdAt', order='desc' } = req.query
  const ownerId = req.user.role === 'owner' ? req.user._id : req.user._id

  const filter = { ownerId, isActive: true }
  if (category)        filter.category = category
  if (minStock === 'low') filter.$expr = { $lte: ['$stock', '$minStock'] }
  if (status === 'out') filter.stock = 0
  if (search) filter.$text = { $search: search }

  const skip  = (parseInt(page) - 1) * parseInt(limit)
  const sort  = { [sortBy]: order === 'asc' ? 1 : -1 }

  const [products, total] = await Promise.all([
    Product.find(filter).populate('category','name slug').skip(skip).limit(parseInt(limit)).sort(sort).lean(),
    Product.countDocuments(filter)
  ])

  res.json(new ApiResponse(200, {
    products,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
  }))
})

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, ownerId: req.user._id })
    .populate('category','name')
  if (!product) throw new ApiError(404, 'Product not found')

  const variants = await ProductVariant.find({ productId: product._id, isActive: true })
  const batches  = await ProductBatch.find({ productId: product._id }).sort({ expiryDate: 1 })

  res.json(new ApiResponse(200, { product, variants, batches }))
})

export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create({ ...req.body, ownerId: req.user._id })
  await delCache(`products:${req.user._id}`)
  res.status(201).json(new ApiResponse(201, product, 'Product created'))
})

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  )
  if (!product) throw new ApiError(404, 'Product not found')
  await delCache(`products:${req.user._id}`)
  res.json(new ApiResponse(200, product, 'Product updated'))
})

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    { isActive: false },
    { new: true }
  )
  if (!product) throw new ApiError(404, 'Product not found')
  res.json(new ApiResponse(200, {}, 'Product deleted'))
})

export const getByBarcode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ barcode: req.params.code, ownerId: req.user._id, isActive: true })
    .populate('category','name')
  if (!product) {
    const variant = await ProductVariant.findOne({ barcode: req.params.code, ownerId: req.user._id })
      .populate('productId')
    if (!variant) throw new ApiError(404, 'Product not found for this barcode')
    return res.json(new ApiResponse(200, { product: variant.productId, variant }))
  }
  res.json(new ApiResponse(200, { product }))
})

export const getLowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({
    ownerId: req.user._id,
    isActive: true,
    $expr: { $lte: ['$stock', '$minStock'] }
  }).populate('category','name').sort({ stock: 1 }).lean()
  res.json(new ApiResponse(200, { products, count: products.length }))
})

export const getExpiring = asyncHandler(async (req, res) => {
  const days   = parseInt(req.query.days) || 30
  const cutoff = new Date(Date.now() + days * 24 * 3600 * 1000)
  const batches = await ProductBatch.find({
    ownerId: req.user._id,
    expiryDate: { $lte: cutoff },
    remainingQty: { $gt: 0 },
    isExpired: false,
  }).populate('productId','name sku').sort({ expiryDate: 1 })
  res.json(new ApiResponse(200, { batches, count: batches.length }))
})

export const bulkImport = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'CSV file required')
  const results = []
  const errors  = []

  await new Promise((resolve, reject) => {
    Readable.from(req.file.buffer.toString())
      .pipe(csv())
      .on('data', row => results.push(row))
      .on('end', resolve)
      .on('error', reject)
  })

  let created = 0
  for (const row of results) {
    try {
      await Product.findOneAndUpdate(
        { ownerId: req.user._id, sku: row.sku || row.SKU },
        {
          ownerId: req.user._id,
          name:          row.name || row.Name,
          sku:           row.sku  || row.SKU,
          barcode:       row.barcode,
          mrp:           parseFloat(row.mrp) || 0,
          sellingPrice:  parseFloat(row.sellingPrice || row.selling_price) || 0,
          purchasePrice: parseFloat(row.purchasePrice || row.purchase_price) || 0,
          stock:         parseInt(row.stock) || 0,
          unit:          row.unit || 'piece',
          gstPercent:    parseFloat(row.gst || row.gstPercent) || 0,
        },
        { upsert: true, new: true }
      )
      created++
    } catch (err) {
      errors.push({ row: row.name, error: err.message })
    }
  }

  res.json(new ApiResponse(200, { imported: created, errors }, `${created} products imported`))
})

export const adjustStock = asyncHandler(async (req, res) => {
  const { adjustment, reason } = req.body
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    { $inc: { stock: adjustment } },
    { new: true }
  )
  if (!product) throw new ApiError(404, 'Product not found')
  res.json(new ApiResponse(200, product, 'Stock adjusted'))
})
