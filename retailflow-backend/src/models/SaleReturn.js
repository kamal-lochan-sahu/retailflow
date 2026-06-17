import mongoose from 'mongoose'

const SaleReturnSchema = new mongoose.Schema({
  ownerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  saleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    name:      String,
    quantity:  Number,
    amount:    Number,
    reason:    String,
  }],
  totalAmount:  { type: Number, required: true },
  refundMode:   { type: String, enum: ['cash','upi','credit'], default: 'cash' },
  staffId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  returnNumber: String,
  notes:        String,
}, { timestamps: true })

SaleReturnSchema.index({ ownerId: 1 })
SaleReturnSchema.index({ saleId: 1 })

export default mongoose.model('SaleReturn', SaleReturnSchema)
