import mongoose from 'mongoose'

const AuditLogSchema = new mongoose.Schema({
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:     { type: String, enum: ['delete'], default: 'delete' },
  model:      { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  label:      { type: String },                              // short human-readable identifier for list display
  snapshot:   { type: mongoose.Schema.Types.Mixed },          // full document as it was at the moment of deletion
  deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

AuditLogSchema.index({ ownerId: 1, createdAt: -1 })
AuditLogSchema.index({ ownerId: 1, model: 1, createdAt: -1 })

export default mongoose.model('AuditLog', AuditLogSchema)
