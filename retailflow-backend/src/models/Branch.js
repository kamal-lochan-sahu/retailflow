import mongoose from 'mongoose'

const BranchSchema = new mongoose.Schema({
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true, trim: true },
  address:   { type: String },
  phone:     String,
  email:     String,
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive:  { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true })

BranchSchema.index({ ownerId: 1 })

export default mongoose.model('Branch', BranchSchema)
