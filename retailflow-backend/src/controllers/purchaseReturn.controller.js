import PurchaseReturn from '../models/PurchaseReturn.js'
import Purchase from '../models/Purchase.js'
import Product from '../models/Product.js'
import Supplier from '../models/Supplier.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateBillNumber } from '../utils/billNumber.utils.js'

export const createReturn = asyncHandler(async (req, res) => {
  const { purchaseId, items, refundMode, notes } = req.body
  if (!items?.length) throw new ApiError(400, 'At least one item is required')

  const purchase = await Purchase.findOne({ _id: purchaseId, ownerId: req.scopeOwnerId })
  if (!purchase) throw new ApiError(404, 'Purchase not found')
  // Stock was only ever added on receive() -- returning against anything
  // else would take stock negative for no reason.
  if (purchase.status !== 'received') throw new ApiError(400, 'Can only return items from a received purchase')

  const totalAmount = items.reduce((s, i) => s + i.amount, 0)
  const returnNumber = await generateBillNumber(req.scopeOwnerId, 'PRTN')

  const purchaseReturn = await PurchaseReturn.create({
    ownerId: req.scopeOwnerId,
    purchaseId, items, totalAmount, refundMode,
    staffId: req.user._id,
    returnNumber, notes,
  })

  // Reverse of receivePurchase's stock $inc
  await Product.bulkWrite(items.map(item => ({
    updateOne: {
      filter: { _id: item.productId },
      update: { $inc: { stock: -item.quantity } },
    }
  })))

  // A credit refund means the supplier reduces what we owe them. Cash/UPI
  // refunds are a separate transaction and don't touch the running balance
  // -- same split saleReturn.controller.js uses for the customer side.
  // Purchase.totalAmount/dueAmount are left as the historical record of what
  // was originally ordered, same as Sale.totalAmount after a sale return.
  if (refundMode === 'credit' && purchase.supplierId) {
    await Supplier.findByIdAndUpdate(purchase.supplierId, {
      $inc: { outstandingBalance: -totalAmount }
    })
  }

  res.status(201).json(new ApiResponse(201, purchaseReturn, 'Purchase return processed'))
})

export const getReturns = asyncHandler(async (req, res) => {
  const returns = await PurchaseReturn.find({ ownerId: req.scopeOwnerId })
    .populate('purchaseId', 'poNumber supplierId')
    .sort({ createdAt: -1 }).lean()
  res.json(new ApiResponse(200, returns))
})
