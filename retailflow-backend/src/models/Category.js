import mongoose from 'mongoose'

const CategorySchema = new mongoose.Schema({
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true, trim: true },
  slug:      { type: String, lowercase: true },
  image:     String,
  parent:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive:  { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

CategorySchema.index({ ownerId: 1, slug: 1 })

export default mongoose.model('Category', CategorySchema)
