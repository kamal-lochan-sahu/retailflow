import mongoose from 'mongoose'

const StaffSchema = new mongoose.Schema({
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  designation:  String,
  salary: {
    amount:     { type: Number, default: 0 },
    paymentDay: { type: Number, default: 1 },
    type:       { type: String, enum: ['monthly','daily','hourly'], default: 'monthly' },
  },
  commission: {
    enabled: { type: Boolean, default: false },
    type:    { type: String, enum: ['percent','flat'] },
    value:   Number,
  },
  joiningDate:  { type: Date, default: Date.now },
  isActive:     { type: Boolean, default: true },
  emergencyContact: String,
  documents:    [String],
}, { timestamps: true })

StaffSchema.index({ ownerId: 1 })

export default mongoose.model('Staff', StaffSchema)
