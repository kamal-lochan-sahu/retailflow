import mongoose from 'mongoose'

const SupplierSchema = new mongoose.Schema({
  ownerId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:               { type: String, required: true, trim: true },
  phone:              String,
  email:              String,
  address:            String,
  gstin:              String,
  drugLicenseNumber:  String,
  outstandingBalance: { type: Number, default: 0 },
  totalPurchased:     { type: Number, default: 0 },
  rating:             { type: Number, min: 1, max: 5, default: 3 },
  notes:              String,
  isActive:           { type: Boolean, default: true },
  isDeleted:          { type: Boolean, default: false },
  deletedAt:          { type: Date, default: null },
  deletedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

SupplierSchema.index({ ownerId: 1 })

export default mongoose.model('Supplier', SupplierSchema)
