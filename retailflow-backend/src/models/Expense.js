import mongoose from 'mongoose'

const ExpenseSchema = new mongoose.Schema({
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  category: {
    type: String,
    enum: ['rent','salary','electricity','maintenance','transport','marketing','purchase','tax','other'],
    required: true
  },
  amount:      { type: Number, required: true },
  description: String,
  date:        { type: Date, default: Date.now },
  receiptUrl:  String,
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'approved' },
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

ExpenseSchema.index({ ownerId: 1, date: -1 })

export default mongoose.model('Expense', ExpenseSchema)
