import Joi from 'joi'

export const createProductSchema = Joi.object({
  name:          Joi.string().min(2).max(100).required(),
  sku:           Joi.string().optional(),
  barcode:       Joi.string().optional(),
  category:      Joi.string().optional(),
  brand:         Joi.string().optional(),
  mrp:           Joi.number().min(0).default(0),
  sellingPrice:  Joi.number().min(0).required(),
  purchasePrice: Joi.number().min(0).default(0),
  stock:         Joi.number().min(0).default(0),
  unit:          Joi.string().valid('piece','kg','gram','litre','ml','dozen','box','packet').default('piece'),
  minStock:      Joi.number().min(0).default(5),
  gstPercent:    Joi.number().valid(0,5,12,18,28).default(0),
  hsnCode:       Joi.string().optional(),
  description:   Joi.string().optional(),
}).options({ stripUnknown: true })
