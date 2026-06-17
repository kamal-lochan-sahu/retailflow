import mongoose from 'mongoose'

const ProductBatchSchema = new mongoose.Schema({
  productId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  ownerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplierId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  batchNumber:   { type: String, required: true },
  expiryDate:    { type: Date, required: true },
  purchaseDate:  { type: Date, default: Date.now },
  quantity:      { type: Number, required: true },
  remainingQty:  { type: Number },
  purchasePrice: { type: Number, default: 0 },
  mrp:           { type: Number, default: 0 },
  isExpired:     { type: Boolean, default: false },
}, { timestamps: true })

ProductBatchSchema.index({ productId: 1, expiryDate: 1 })
ProductBatchSchema.index({ ownerId: 1, expiryDate: 1 })
ProductBatchSchema.pre('save', function(next) {
  if (this.isNew) this.remainingQty = this.quantity
  this.isExpired = this.expiryDate < new Date()
  next()
})

export default mongoose.model('ProductBatch', ProductBatchSchema)
