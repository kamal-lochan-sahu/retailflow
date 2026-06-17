import mongoose from 'mongoose'

const ProductSchema = new mongoose.Schema({
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:       { type: String, required: true, trim: true },
  slug:       String,
  description:String,
  images:     [String],
  category:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand:      String,
  tags:       [String],
  barcode:    { type: String, trim: true },
  sku:        { type: String, trim: true },

  // Pricing
  mrp:            { type: Number, default: 0 },
  sellingPrice:   { type: Number, required: true, default: 0 },
  purchasePrice:  { type: Number, default: 0 },
  wholesalePrice: { type: Number, default: 0 },

  // Stock
  stock:     { type: Number, default: 0 },
  unit:      { type: String, enum: ['piece','kg','gram','litre','ml','dozen','box','packet'], default: 'piece' },
  minStock:  { type: Number, default: 5 },
  reorderQty:{ type: Number, default: 10 },

  // GST
  gstPercent: { type: Number, default: 0 },
  hsnCode:    String,

  // Variants
  hasVariants: { type: Boolean, default: false },

  // Pharmacy specific
  schedule:               { type: String, enum: ['OTC','H','H1','X',''], default: '' },
  requiresPrescription:   { type: Boolean, default: false },
  rackLocation:           String,
  genericName:            String,
  manufacturer:           String,

  // General retail
  hasSerialNumber:  { type: Boolean, default: false },
  warrantyMonths:   { type: Number, default: 0 },

  // Grocery
  isLoose:        { type: Boolean, default: false },
  isPerishable:   { type: Boolean, default: false },

  isActive:   { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isOnlineVisible: { type: Boolean, default: true },
}, { timestamps: true })

ProductSchema.index({ ownerId: 1 })
ProductSchema.index({ barcode: 1 })
ProductSchema.index({ sku: 1 })
ProductSchema.index({ ownerId: 1, name: 'text', brand: 'text', tags: 'text' })
ProductSchema.index({ stock: 1, minStock: 1 })

export default mongoose.model('Product', ProductSchema)
