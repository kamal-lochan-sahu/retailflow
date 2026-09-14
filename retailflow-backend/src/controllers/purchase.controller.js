import Purchase from '../models/Purchase.js'
import Product from '../models/Product.js'
import ProductBatch from '../models/ProductBatch.js'
import Supplier from '../models/Supplier.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateBillNumber } from '../utils/billNumber.utils.js'

export const getPurchases = asyncHandler(async (req, res) => {
  const { page=1, limit=20, supplierId, status } = req.query
  const filter = { ownerId: req.user._id }
  if (supplierId) filter.supplierId = supplierId
  if (status)     filter.status     = status

  const skip = (parseInt(page)-1) * parseInt(limit)
  const [purchases, total] = await Promise.all([
    Purchase.find(filter)
      .populate('supplierId','name phone')
      .sort({ createdAt: -1 })
      .skip(skip).limit(parseInt(limit))
      .lean(),
    Purchase.countDocuments(filter)
  ])
  res.json(new ApiResponse(200, {
    purchases,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total/limit) }
  }))
})

export const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, ownerId: req.user._id })
    .populate('supplierId','name phone email')
  if (!purchase) throw new ApiError(404, 'Purchase not found')
  res.json(new ApiResponse(200, purchase))
})

export const createPurchase = asyncHandler(async (req, res) => {
  const poNumber = await generateBillNumber(req.user._id, 'PO')
  const purchase = await Purchase.create({ ...req.body, ownerId: req.user._id, poNumber })
  res.status(201).json(new ApiResponse(201, purchase, 'Purchase order created'))
})

export const updatePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id, status: { $in: ['draft','sent'] } },
    req.body,
    { new: true }
  )
  if (!purchase) throw new ApiError(404, 'Purchase not found or already received')
  res.json(new ApiResponse(200, purchase, 'Purchase updated'))
})

export const receivePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, ownerId: req.user._id })
  if (!purchase) throw new ApiError(404, 'Purchase not found')
  if (purchase.status === 'received') throw new ApiError(400, 'Already received')

  // Bulk update all products at once
  const bulkOps = purchase.items.map(item => ({
    updateOne: {
      filter: { _id: item.productId },
      update: {
        $inc: { stock: item.quantity },
        $set: {
          purchasePrice: item.purchasePrice,
          ...(item.mrp          && { mrp:          item.mrp }),
          ...(item.sellingPrice && { sellingPrice: item.sellingPrice }),
        }
      }
    }
  }))
  await Product.bulkWrite(bulkOps)

  // Create batches for pharmacy products
  const batchDocs = purchase.items
    .filter(item => item.batchNumber && item.expiryDate)
    .map(item => ({
      productId:     item.productId,
      ownerId:       req.user._id,
      supplierId:    purchase.supplierId,
      batchNumber:   item.batchNumber,
      expiryDate:    item.expiryDate,
      quantity:      item.quantity,
      remainingQty:  item.quantity,
      purchasePrice: item.purchasePrice,
      mrp:           item.mrp,
    }))
  if (batchDocs.length) await ProductBatch.insertMany(batchDocs)

  purchase.status     = 'received'
  purchase.receivedAt = new Date()
  purchase.receivedBy = req.user._id
  await purchase.save()

  if (purchase.supplierId) {
    await Supplier.findByIdAndUpdate(purchase.supplierId, {
      $inc: {
        totalPurchased:     purchase.totalAmount,
        outstandingBalance: purchase.dueAmount,
      }
    })
  }

  res.json(new ApiResponse(200, purchase, 'Stock received'))
})
