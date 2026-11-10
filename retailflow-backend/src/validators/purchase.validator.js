import Joi from 'joi'

export const createPurchaseSchema = Joi.object({
  supplierId:    Joi.string().hex().length(24).empty('').optional(),
  items: Joi.array().items(Joi.object({
    productId:     Joi.string().hex().length(24).required(),
    quantity:      Joi.number().min(1).required(),
    purchasePrice: Joi.number().min(0).required(),
    mrp:           Joi.number().min(0).optional(),
    sellingPrice:  Joi.number().min(0).optional(),
    batchNumber:   Joi.string().empty('').optional(),
    expiryDate:    Joi.date().empty('').optional(),
    gstPercent:    Joi.number().default(0),
  })).min(1).required(),
  invoiceNumber:  Joi.string().empty('').optional(),
  invoiceDate:    Joi.date().empty('').optional(),
  paymentMode:    Joi.string().empty('').optional(),
  notes:          Joi.string().allow('', null).optional(),
}).options({ stripUnknown: true })
