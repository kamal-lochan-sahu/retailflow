import mongoose from 'mongoose'

const SettingsSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  shop: {
    name:        { type: String, default: () => process.env.SHOP_NAME },
    logo:        String,
    address:     String,
    phone:       String,
    email:       String,
    gstin:       String,
    drugLicense: String,
    website:     String,
  },
  branding: {
    primaryColor: { type: String, default: '#2563eb' },
    domain:       String,
  },
  billing: {
    receiptTemplate:  { type: String, default: 'standard' },
    showMrp:          { type: Boolean, default: true },
    showGst:          { type: Boolean, default: true },
    showSavings:      { type: Boolean, default: true },
    thankYouMessage:  { type: String, default: 'Thank you for shopping with us! 🙏' },
    footerText:       String,
    prefix:           { type: String, default: 'INV' },
  },
  stock: {
    defaultLowStockThreshold: { type: Number, default: 5 },
    expiryAlertDays:          { type: [Number], default: [30, 15, 7] },
    autoAdjustOnSale:         { type: Boolean, default: true },
  },
  loyalty: {
    enabled:         { type: Boolean, default: false },
    pointsPerRupee:  { type: Number, default: 1 },
    redemptionValue: { type: Number, default: 0.25 }, // 1 point = ₹0.25
    minRedemption:   { type: Number, default: 100 },
    tiers: {
      silver:   { type: Number, default: 1000 },
      gold:     { type: Number, default: 5000 },
      platinum: { type: Number, default: 20000 },
    }
  },
  notifications: {
    dailyReport:   { type: Boolean, default: true },
    lowStock:      { type: Boolean, default: true },
    expiryAlert:   { type: Boolean, default: true },
    udharReminder: { type: Boolean, default: true },
    reportEmail:   String,
    alertPhone:    String,
  },
  tax: {
    defaultGstSlabs: {
      type: [Number],
      default: [0, 5, 12, 18, 28]
    }
  },
  features: {
    onlineOrdering:     { type: Boolean, default: false },
    homeDelivery:       { type: Boolean, default: false },
    udhaarSystem:       { type: Boolean, default: true  },
    loyaltyProgram:     { type: Boolean, default: false },
    multiCounter:       { type: Boolean, default: false },
    multiBranch:        { type: Boolean, default: false },
    gstBilling:         { type: Boolean, default: true  },
    barcode:            { type: Boolean, default: true  },
    prescriptionSystem: { type: Boolean, default: false },
    weightBilling:      { type: Boolean, default: false },
    variantSystem:      { type: Boolean, default: false },
    departmentMgmt:     { type: Boolean, default: false },
    warrantyMgmt:       { type: Boolean, default: false },
    selfCheckout:       { type: Boolean, default: false },
  }
}, { timestamps: true })

export default mongoose.model('Settings', SettingsSchema)
