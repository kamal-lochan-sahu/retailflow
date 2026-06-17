import { Router } from 'express'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct,
         getByBarcode, getLowStock, getExpiring, bulkImport, adjustStock } from '../controllers/product.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { ownerOnly, managerUp, stockboyUp } from '../middleware/role.middleware.js'
import multer from 'multer'

const router  = Router()
const memStorage = multer({ storage: multer.memoryStorage() })
router.use(authenticate)
router.get( '/',              getProducts)
router.post('/',              managerUp, createProduct)
router.get( '/low-stock',     getLowStock)
router.get( '/expiring',      getExpiring)
router.get( '/barcode/:code', getByBarcode)
router.post('/bulk-import',   managerUp, memStorage.single('file'), bulkImport)
router.get( '/:id',           getProduct)
router.put( '/:id',           managerUp,  updateProduct)
router.delete('/:id',         ownerOnly, deleteProduct)
router.post('/:id/adjust',    stockboyUp, adjustStock)
export default router
