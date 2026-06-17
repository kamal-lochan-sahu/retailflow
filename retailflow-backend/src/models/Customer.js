import mongoose from 'mongoose'

const CustomerSchema = new mongoose.Schema({
  ownerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, trim: true },
  email:    String,
  address:  String,
  gstin:    String,
  type:     { type: String, enum: ['regular','wholesale','vip','defaulter'], default: 'regular' },
  creditLimit:        { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  loyaltyPoints:      { type: Number, default: 0 },
  totalLoyaltyEarned: { type: Number, default: 0 },
  memberCardNumber:   String,
  tier:               { type: String, enum: ['none','silver','gold','platinum'], default: 'none' },
  birthday:   Date,
  anniversary:Date,
  isBlocked:  { type: Boolean, default: false },
  notes:      String,
  totalPurchase: { type: Number, default: 0 },
  visitCount:    { type: Number, default: 0 },
  lastVisit:     Date,
}, { timestamps: true })

CustomerSchema.index({ ownerId: 1 })
CustomerSchema.index({ ownerId: 1, phone: 1 })
CustomerSchema.index({ ownerId: 1, name: 'text', phone: 'text' })

export default mongoose.model('Customer', CustomerSchema)
