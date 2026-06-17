import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['low_stock','expiry','udhaar_reminder','daily_report','order','system','salary'],
    required: true
  },
  title:     { type: String, required: true },
  message:   String,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  customerId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'OnlineOrder' },
  channel:   { type: String, enum: ['whatsapp','sms','email','inapp'], default: 'inapp' },
  status:    { type: String, enum: ['sent','failed','pending','read'], default: 'pending' },
  isRead:    { type: Boolean, default: false },
  readAt:    Date,
  error:     String,
}, { timestamps: true })

NotificationSchema.index({ ownerId: 1, isRead: 1, createdAt: -1 })

export default mongoose.model('Notification', NotificationSchema)
