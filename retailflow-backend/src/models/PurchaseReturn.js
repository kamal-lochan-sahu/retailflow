import mongoose from 'mongoose'

const PurchaseReturnSchema = new mongoose.Schema({
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purchaseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name:      String,
    quantity:  Number,
    amount:    Number,
    reason:    String,
  }],
  totalAmount:  { type: Number, required: true },
  refundMode:   { type: String, enum: ['cash','upi','credit'], default: 'credit' },
  staffId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  returnNumber: String,
  notes:        String,
}, { timestamps: true })

PurchaseReturnSchema.index({ ownerId: 1 })
PurchaseReturnSchema.index({ purchaseId: 1 })

export default mongoose.model('PurchaseReturn', PurchaseReturnSchema)
