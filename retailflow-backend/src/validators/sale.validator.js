import Joi from 'joi'

export const createSaleSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    productId:    Joi.string().required(),
    variantId:    Joi.string().optional().allow(null, ''),
    quantity:     Joi.number().min(0.01).required(),
    sellingPrice: Joi.number().min(0).optional(),
    discount:     Joi.number().min(0).default(0),
    discountType: Joi.string().valid('flat','percent').default('flat'),
  })).min(1).required(),
  customerId:     Joi.string().optional().allow('', null),
  paymentMode:    Joi.string().valid('cash','upi','card','credit','split','loyalty').required(),
  payments:       Joi.array().optional(),
  discountAmount: Joi.number().min(0).default(0),
  discountType:   Joi.string().valid('flat','percent').default('flat'),
  notes:          Joi.string().optional().allow(''),
  isGstBill:      Joi.boolean().default(false),
  sendWhatsApp:   Joi.boolean().default(false),
  pointsRedeemed: Joi.number().min(0).default(0),
  branchId:       Joi.string().optional(),
  counterId:      Joi.string().optional(),
  clientId:       Joi.string().max(64).optional(),
}).options({ stripUnknown: true })

// Offline sales are replayed with the time they were actually rung up.
export const syncOfflineSaleSchema = createSaleSchema.keys({
  clientId:         Joi.string().max(64).required(),
  offlineCreatedAt: Joi.date().iso().required(),
})
