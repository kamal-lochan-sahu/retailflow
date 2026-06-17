import mongoose from 'mongoose'

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:  String,
  image: String,
  quantity: Number,
  price: Number,
  total: Number,
}, { _id: false })

const StatusHistorySchema = new mongoose.Schema({
  status:    String,
  timestamp: { type: Date, default: Date.now },
  note:      String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false })

const OnlineOrderSchema = new mongoose.Schema({
  ownerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  orderId:  { type: String, unique: true },

  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: String,
  phone:        String,
  email:        String,
  address: {
    line1:  String,
    city:   String,
    state:  String,
    pincode:String,
    lat:    Number,
    lng:    Number,
  },

  items: [OrderItemSchema],

  subtotal:       { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },
  total:          { type: Number, required: true },

  paymentMode:   { type: String, enum: ['cod','upi','razorpay','stripe','credit'] },
  paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  paymentRef:    String,

  status: {
    type: String,
    enum: ['placed','confirmed','packed','out_for_delivery','delivered','cancelled','returned'],
    default: 'placed'
  },
  statusHistory: [StatusHistorySchema],

  deliveryPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledTime:    Date,
  deliveredAt:      Date,
  cancelReason:     String,
  notes:            String,
}, { timestamps: true })

OnlineOrderSchema.index({ ownerId: 1, status: 1 })
OnlineOrderSchema.index({ ownerId: 1, createdAt: -1 })
OnlineOrderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = `ORD-${Date.now()}`
  }
  next()
})

export default mongoose.model('OnlineOrder', OnlineOrderSchema)
