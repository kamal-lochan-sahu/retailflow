import { Router } from 'express'
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getByBarcode, getLowStock, getExpiring, bulkImport, adjustStock
} from '../controllers/product.controller.js'
import { authenticate }  from '../middleware/auth.middleware.js'
import { ownerOnly, managerUp, stockboyUp } from '../middleware/role.middleware.js'
import { validate }      from '../middleware/validate.middleware.js'
import { createProductSchema } from '../validators/product.validator.js'
import multer from 'multer'
import { validateUpdate } from '../middleware/validate.middleware.js'
import { updateProductSchema } from '../validators/update.validator.js'

const router     = Router()
const memStorage = multer({ storage: multer.memoryStorage() })

router.use(authenticate)
router.get( '/',              getProducts)
router.post('/',              managerUp, validate(createProductSchema), createProduct)
router.get( '/low-stock',     getLowStock)
router.get( '/expiring',      getExpiring)
router.get( '/barcode/:code', getByBarcode)
router.post('/bulk-import',   managerUp, memStorage.single('file'), bulkImport)
router.get( '/:id',           getProduct)
router.put( '/:id',           managerUp, validateUpdate(updateProductSchema), updateProduct)
router.delete('/:id',         ownerOnly,  deleteProduct)
router.post('/:id/adjust',    stockboyUp, adjustStock)
export default router
