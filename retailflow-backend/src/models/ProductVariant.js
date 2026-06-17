import mongoose from 'mongoose'

const ProductVariantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attributes: {
    size:    String,
    color:   String,
    weight:  String,
    flavor:  String,
    other:   String,
  },
  barcode:       String,
  sku:           String,
  stock:         { type: Number, default: 0 },
  sellingPrice:  { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 },
  mrp:           { type: Number, default: 0 },
  image:         String,
  isActive:      { type: Boolean, default: true },
}, { timestamps: true })

ProductVariantSchema.index({ productId: 1 })

export default mongoose.model('ProductVariant', ProductVariantSchema)
