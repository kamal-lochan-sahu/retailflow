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
    Purchase.find(filter).populate('supplierId','name phone').sort({createdAt:-1}).skip(skip).limit(parseInt(limit)),
    Purchase.countDocuments(filter)
  ])
  res.json(new ApiResponse(200, { purchases, pagination:{total, page:parseInt(page), pages:Math.ceil(total/limit)} }))
})

export const createPurchase = asyncHandler(async (req, res) => {
  const poNumber = await generateBillNumber(req.user._id, 'PO')
  const purchase = await Purchase.create({ ...req.body, ownerId: req.user._id, poNumber })
  res.status(201).json(new ApiResponse(201, purchase, 'Purchase order created'))
})

export const receivePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, ownerId: req.user._id })
  if (!purchase) throw new ApiError(404, 'Purchase not found')
  if (purchase.status === 'received') throw new ApiError(400, 'Already received')

  for (const item of purchase.items) {
    // Update product stock and price
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity },
      $set: {
        purchasePrice: item.purchasePrice,
        ...(item.mrp && { mrp: item.mrp }),
        ...(item.sellingPrice && { sellingPrice: item.sellingPrice })
      }
    })
    // Create batch for pharmacy
    if (item.batchNumber && item.expiryDate) {
      await ProductBatch.create({
        productId:     item.productId,
        ownerId:       req.user._id,
        supplierId:    purchase.supplierId,
        batchNumber:   item.batchNumber,
        expiryDate:    item.expiryDate,
        quantity:      item.quantity,
        purchasePrice: item.purchasePrice,
        mrp:           item.mrp,
      })
    }
  }

  purchase.status     = 'received'
  purchase.receivedAt = new Date()
  purchase.receivedBy = req.user._id
  if (purchase.supplierId) {
    await Supplier.findByIdAndUpdate(purchase.supplierId, {
      $inc: { totalPurchased: purchase.totalAmount, outstandingBalance: purchase.dueAmount }
    })
  }
  await purchase.save()
  res.json(new ApiResponse(200, purchase, 'Stock received'))
})
