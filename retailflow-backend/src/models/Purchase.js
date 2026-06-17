import mongoose from 'mongoose'

const PurchaseItemSchema = new mongoose.Schema({
  productId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:          String,
  batchNumber:   String,
  expiryDate:    Date,
  quantity:      { type: Number, required: true },
  unit:          String,
  purchasePrice: { type: Number, required: true },
  mrp:           Number,
  sellingPrice:  Number,
  gstPercent:    { type: Number, default: 0 },
  total:         Number,
}, { _id: false })

const PurchaseSchema = new mongoose.Schema({
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  poNumber:   { type: String },
  status:     { type: String, enum: ['draft','sent','received','partial','cancelled'], default: 'draft' },

  items: [PurchaseItemSchema],

  subtotal:    { type: Number, default: 0 },
  gstAmount:   { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount:  { type: Number, default: 0 },
  dueAmount:   { type: Number, default: 0 },

  paymentMode:   String,
  invoiceNumber: String,
  invoiceDate:   Date,
  invoiceUrl:    String,
  notes:         String,

  receivedAt:  Date,
  receivedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

PurchaseSchema.index({ ownerId: 1, createdAt: -1 })
PurchaseSchema.index({ supplierId: 1 })

export default mongoose.model('Purchase', PurchaseSchema)
