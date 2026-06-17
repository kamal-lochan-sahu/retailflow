import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password:     { type: String, required: true, select: false },
  refreshToken: { type: String, select: false },
  avatar: String,
  role: {
    type: String,
    enum: ['owner','manager','cashier','stockboy','delivery'],
    default: 'cashier'
  },
  branding: {
    shopName:    { type: String, default: () => process.env.SHOP_NAME },
    logo:        String,
    primaryColor:{ type: String, default: () => process.env.BRAND_COLOR || '#2563eb' },
    domain:      String,
    gstin:       String,
    drugLicense: String,
    address:     String,
    phone:       String,
    email:       String,
  },
  isActive:  { type: Boolean, default: true },
  lastLogin: Date,
}, { timestamps: true })

UserSchema.index({ email: 1 })

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.isPasswordCorrect = function(password) {
  return bcrypt.compare(password, this.password)
}

export default mongoose.model('User', UserSchema)
