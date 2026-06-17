import mongoose from 'mongoose'

const SalarySchema = new mongoose.Schema({
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  month:       { type: Number, required: true },
  year:        { type: Number, required: true },
  basicSalary: { type: Number, default: 0 },
  commission:  { type: Number, default: 0 },
  advance:     { type: Number, default: 0 },
  deductions:  { type: Number, default: 0 },
  bonus:       { type: Number, default: 0 },
  netSalary:   { type: Number, required: true },
  paidDate:    Date,
  paymentMode: { type: String, enum: ['cash','bank','upi'] },
  note:        String,
  status:      { type: String, enum: ['pending','paid'], default: 'pending' },
}, { timestamps: true })

SalarySchema.index({ ownerId: 1, staffId: 1, month: 1, year: 1 }, { unique: true })

export default mongoose.model('Salary', SalarySchema)
