import mongoose from 'mongoose'

const SaleItemSchema = new mongoose.Schema({
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  variantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  batchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'ProductBatch' },
  name:       String,
  barcode:    String,
  sku:        String,
  quantity:   { type: Number, required: true },
  unit:       String,
  mrp:        Number,
  sellingPrice:{ type: Number, required: true },
  discount:   { type: Number, default: 0 },
  discountType:{ type: String, enum: ['flat','percent'], default: 'flat' },
  gstPercent: { type: Number, default: 0 },
  gstAmount:  { type: Number, default: 0 },
  total:      { type: Number, required: true },
}, { _id: false })

const PaymentSchema = new mongoose.Schema({
  mode:   { type: String, enum: ['cash','upi','card','credit','loyalty','cheque','netbanking'] },
  amount: Number,
  reference: String,
}, { _id: false })

const SaleSchema = new mongoose.Schema({
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  billNumber: { type: String, required: true },
  counterId:  String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  staffId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  items: [SaleItemSchema],

  subtotal:       { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  discountType:   { type: String, enum: ['flat','percent'], default: 'flat' },
  gstAmount:      { type: Number, default: 0 },
  roundOff:       { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true },

  paymentMode: { type: String, enum: ['cash','upi','card','credit','split','loyalty','mixed'] },
  payments:    [PaymentSchema],

  creditAmount:     { type: Number, default: 0 },
  paidAmount:       { type: Number, default: 0 },

  pointsEarned:    { type: Number, default: 0 },
  pointsRedeemed:  { type: Number, default: 0 },

  status: { type: String, enum: ['completed','void','return','hold'], default: 'completed' },
  notes:  String,

  gstin:    String,
  isGstBill:{ type: Boolean, default: false },

  isOnlineOrder: { type: Boolean, default: false },
  orderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'OnlineOrder' },

  // Offline billing — clientId is the idempotency key generated on the till; a sale
  // rung up offline is replayed to the server later, possibly more than once.
  clientId:     String,
  isOffline:    { type: Boolean, default: false },
  syncedAt:     Date,
  // Set when the sale can't be fully trusted as-is (e.g. stock went negative on sync).
  needsReview:  { type: Boolean, default: false },
  reviewReason: String,
}, { timestamps: true })

SaleSchema.index({ ownerId: 1, createdAt: -1 })
SaleSchema.index({ billNumber: 1 })
SaleSchema.index({ ownerId: 1, customerId: 1 })
SaleSchema.index({ ownerId: 1, status: 1 })
SaleSchema.index({ ownerId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } })

export default mongoose.model('Sale', SaleSchema)
