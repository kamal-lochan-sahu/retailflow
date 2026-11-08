import Joi from 'joi'

// Schemas for PUT/update endpoints. Rules that differ from the create schemas:
//  - every field is optional (partial update) but the body may not be empty
//  - NO .default() anywhere — a default would silently overwrite a stored value
//  - unknown keys are stripped (validateUpdate writes the cleaned body back to req.body),
//    so counters / ownership / soft-delete fields can never be set through an update
//  - '' is allowed on optional text fields so a form can clear them
const objectId = Joi.string().hex().length(24)
const text     = (max = 200) => Joi.string().trim().max(max).allow('', null)
const phone    = Joi.string().trim().pattern(/^[0-9+\-\s]{7,15}$/).allow('', null).messages({ 'string.pattern.base': 'phone must be 7-15 digits' })
const email    = Joi.string().trim().email({ tlds: { allow: false } }).allow('', null)
const gstin    = Joi.string().trim().uppercase().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/).allow('', null).messages({ 'string.pattern.base': 'GSTIN format is invalid' })
const money    = Joi.number().min(0).max(100000000)
const opts     = { stripUnknown: true }
const partial  = (keys) => Joi.object(keys).min(1).options(opts)

export const updateProductSchema = partial({
  name:           Joi.string().trim().min(2).max(100),
  slug:           text(150),
  description:    text(2000),
  images:         Joi.array().items(Joi.string().uri().max(500)).max(10),
  category:       objectId.allow(null).empty(''),
  brand:          text(100),
  tags:           Joi.array().items(Joi.string().trim().max(50)).max(30),
  barcode:        text(64),
  sku:            text(64),
  mrp:            money,
  sellingPrice:   money,
  purchasePrice:  money,
  wholesalePrice: money,
  stock:          Joi.number().min(0).max(100000000),
  unit:           Joi.string().valid('piece','kg','gram','litre','ml','dozen','box','packet'),
  minStock:       Joi.number().min(0),
  reorderQty:     Joi.number().min(0),
  gstPercent:     Joi.number().valid(0, 5, 12, 18, 28),
  hsnCode:        text(20),
  hasVariants:    Joi.boolean(),
  schedule:       Joi.string().valid('OTC','H','H1','X',''),
  requiresPrescription: Joi.boolean(),
  rackLocation:   text(50),
  genericName:    text(100),
  manufacturer:   text(100),
  hasSerialNumber: Joi.boolean(),
  warrantyMonths: Joi.number().min(0).max(240),
  isLoose:        Joi.boolean(),
  isPerishable:   Joi.boolean(),
  isActive:       Joi.boolean(),
  isFeatured:     Joi.boolean(),
  isOnlineVisible: Joi.boolean(),
})

export const updateCustomerSchema = partial({
  name:             Joi.string().trim().min(1).max(100),
  phone,
  email,
  address:          text(300),
  gstin,
  type:             Joi.string().valid('regular','wholesale','vip','defaulter'),
  creditLimit:      money,
  memberCardNumber: text(50),
  tier:             Joi.string().valid('none','silver','gold','platinum'),
  birthday:         Joi.date().allow(null, ''),
  anniversary:      Joi.date().allow(null, ''),
  isBlocked:        Joi.boolean(),
  notes:            text(1000),
})

export const updateSupplierSchema = partial({
  name:              Joi.string().trim().min(1).max(100),
  phone,
  email,
  address:           text(300),
  gstin,
  drugLicenseNumber: text(50),
  rating:            Joi.number().min(1).max(5),
  notes:             text(1000),
  isActive:          Joi.boolean(),
})

export const updateExpenseSchema = partial({
  category:    Joi.string().valid('rent','salary','electricity','maintenance','transport','marketing','purchase','tax','other'),
  amount:      Joi.number().positive().max(100000000),
  description: text(500),
  date:        Joi.date(),
  receiptUrl:  Joi.string().uri().max(500).allow('', null),
  status:      Joi.string().valid('pending','approved','rejected'),
  branchId:    objectId.allow(null).empty(''),
})

export const updateCategorySchema = partial({
  name:      Joi.string().trim().min(1).max(60),
  slug:      Joi.string().trim().lowercase().max(80).allow('', null),
  image:     Joi.string().max(500).allow('', null),
  parent:    objectId.allow(null).empty(''),
  isActive:  Joi.boolean(),
  sortOrder: Joi.number().integer().min(0).max(100000),
})

export const updateBranchSchema = partial({
  name:      Joi.string().trim().min(1).max(100),
  address:   text(300),
  phone,
  email,
  managerId: objectId.allow(null).empty(''),
  isActive:  Joi.boolean(),
  isDefault: Joi.boolean(),
})

export const updateStaffSchema = partial({
  name:        Joi.string().trim().min(2).max(50),
  phone,
  role:        Joi.string().valid('manager','cashier','stockboy','delivery'),
  designation: text(100),
  salary: Joi.object({
    amount:     money,
    paymentDay: Joi.number().integer().min(1).max(31),
    type:       Joi.string().valid('monthly','daily','hourly'),
  }).options(opts),
  commission: Joi.object({
    enabled: Joi.boolean(),
    type:    Joi.string().valid('percent','flat'),
    value:   Joi.number().min(0).max(100000000),
  }).options(opts),
  emergencyContact: text(100),
  joiningDate:      Joi.date(),
  isActive:         Joi.boolean(),
})

const purchaseItem = Joi.object({
  productId:     objectId.required(),
  name:          text(150),
  quantity:      Joi.number().min(1).required(),
  unit:          text(20),
  purchasePrice: Joi.number().min(0).required(),
  mrp:           Joi.number().min(0),
  sellingPrice:  Joi.number().min(0),
  batchNumber:   text(50),
  expiryDate:    Joi.date().allow(null, ''),
  gstPercent:    Joi.number().min(0).max(100),
}).options(opts)

// Only draft/sent purchases can be updated (enforced in the controller). 'received' is reachable
// only through POST /:id/receive, which is the one place that moves stock.
export const updatePurchaseSchema = partial({
  supplierId:    objectId.allow(null).empty(''),
  items:         Joi.array().items(purchaseItem).min(1),
  status:        Joi.string().valid('draft','sent','cancelled'),
  paidAmount:    money,
  paymentMode:   text(30),
  invoiceNumber: text(50),
  invoiceDate:   Joi.date().allow(null, ''),
  invoiceUrl:    Joi.string().uri().max(500).allow('', null),
  notes:         text(1000),
})

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('placed','confirmed','packed','out_for_delivery','delivered','cancelled','returned').required(),
  note:   text(300),
}).options(opts)

export const assignDeliverySchema = Joi.object({
  deliveryPersonId: objectId.required(),
}).options(opts)

const bool = Joi.boolean()
export const updateSettingsSchema = partial({
  shop: Joi.object({
    name: text(100), logo: text(500), address: text(300), phone, email, gstin,
    drugLicense: text(50), website: text(200),
  }).options(opts),
  branding: Joi.object({
    primaryColor: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/),
    domain:       text(200),
  }).options(opts),
  billing: Joi.object({
    receiptTemplate: Joi.string().max(30),
    showMrp: bool, showGst: bool, showSavings: bool,
    thankYouMessage: text(200),
    footerText:      text(300),
    prefix:          Joi.string().trim().uppercase().pattern(/^[A-Z0-9-]{1,10}$/).messages({ 'string.pattern.base': 'bill prefix must be 1-10 letters/digits' }),
  }).options(opts),
  stock: Joi.object({
    defaultLowStockThreshold: Joi.number().integer().min(0).max(100000),
    expiryAlertDays:          Joi.array().items(Joi.number().integer().min(1).max(365)).max(10),
    autoAdjustOnSale:         bool,
  }).options(opts),
  loyalty: Joi.object({
    enabled: bool,
    pointsPerRupee:  Joi.number().min(0).max(1000),
    redemptionValue: Joi.number().min(0).max(1000),
    minRedemption:   Joi.number().min(0).max(1000000),
    tiers: Joi.object({
      silver: Joi.number().min(0), gold: Joi.number().min(0), platinum: Joi.number().min(0),
    }).options(opts),
  }).options(opts),
  notifications: Joi.object({
    dailyReport: bool, lowStock: bool, expiryAlert: bool, udharReminder: bool,
    reportEmail: email, alertPhone: phone,
  }).options(opts),
  tax: Joi.object({
    defaultGstSlabs: Joi.array().items(Joi.number().valid(0, 5, 12, 18, 28)).max(10),
  }).options(opts),
  features: Joi.object({
    onlineOrdering: bool, homeDelivery: bool, udhaarSystem: bool, loyaltyProgram: bool,
    multiCounter: bool, multiBranch: bool, gstBilling: bool, barcode: bool,
    prescriptionSystem: bool, weightBilling: bool, variantSystem: bool,
    departmentMgmt: bool, warrantyMgmt: bool, selfCheckout: bool,
  }).options(opts),
})
