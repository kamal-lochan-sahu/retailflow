import mongoose from 'mongoose'

const UdhaarLedgerSchema = new mongoose.Schema({
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type:       { type: String, enum: ['credit','payment','adjustment'], required: true },
  saleId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  amount:     { type: Number, required: true },
  balance:    { type: Number, required: true },  // running balance after this txn
  note:       String,
  staffId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentMode:String,
}, { timestamps: true })

UdhaarLedgerSchema.index({ customerId: 1, createdAt: -1 })
UdhaarLedgerSchema.index({ ownerId: 1 })

export default mongoose.model('UdhaarLedger', UdhaarLedgerSchema)
