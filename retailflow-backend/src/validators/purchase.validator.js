import Joi from 'joi'

export const createPurchaseSchema = Joi.object({
  supplierId:    Joi.string().optional(),
  items: Joi.array().items(Joi.object({
    productId:     Joi.string().required(),
    quantity:      Joi.number().min(1).required(),
    purchasePrice: Joi.number().min(0).required(),
    mrp:           Joi.number().min(0).optional(),
    sellingPrice:  Joi.number().min(0).optional(),
    batchNumber:   Joi.string().optional(),
    expiryDate:    Joi.date().optional(),
    gstPercent:    Joi.number().default(0),
  })).min(1).required(),
  invoiceNumber:  Joi.string().optional(),
  invoiceDate:    Joi.date().optional(),
  paymentMode:    Joi.string().optional(),
  notes:          Joi.string().optional(),
}).options({ stripUnknown: true })
