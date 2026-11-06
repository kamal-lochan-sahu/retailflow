import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { errorHandler } from './src/middleware/error.middleware.js'
import { apiRateLimit } from './src/middleware/rateLimit.middleware.js'
import { sanitizeRequest } from './src/middleware/sanitize.middleware.js'
import { getAllowedOrigins } from './src/config/origins.js'
import mongoose from 'mongoose'

import authRoutes        from './src/routes/auth.routes.js'
import branchRoutes      from './src/routes/branch.routes.js'
import categoryRoutes    from './src/routes/category.routes.js'
import productRoutes     from './src/routes/product.routes.js'
import customerRoutes    from './src/routes/customer.routes.js'
import saleRoutes        from './src/routes/sale.routes.js'
import saleReturnRoutes  from './src/routes/saleReturn.routes.js'
import purchaseRoutes    from './src/routes/purchase.routes.js'
import purchaseReturnRoutes from './src/routes/purchaseReturn.routes.js'
import supplierRoutes    from './src/routes/supplier.routes.js'
import udhaarRoutes      from './src/routes/udhaar.routes.js'
import onlineOrderRoutes from './src/routes/onlineOrder.routes.js'
import staffRoutes       from './src/routes/staff.routes.js'
import expenseRoutes     from './src/routes/expense.routes.js'
import analyticsRoutes   from './src/routes/analytics.routes.js'
import settingsRoutes    from './src/routes/settings.routes.js'
import uploadRoutes      from './src/routes/upload.routes.js'
import posRoutes         from './src/routes/pos.routes.js'
import auditLogRoutes    from './src/routes/auditLog.routes.js'

const app = express()

// Render (and Vercel) sit behind a proxy: without this every visitor looks like the same IP,
// so the rate limiters below would count the whole shop as one client.
app.set('trust proxy', 1)

const allowedOrigins = getAllowedOrigins()

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow PDF from different origin
}))
app.use(compression())
app.use(cors({
  origin: (origin, cb) => {
    // no Origin header = curl / server-to-server / direct PDF links; browsers must be on the allow-list
    cb(null, !origin || allowedOrigins.includes(origin))
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  exposedHeaders: ['Content-Disposition','Content-Length'],
}))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))
app.use(sanitizeRequest)
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'))
app.use('/api', apiRateLimit)

app.use('/api/auth',       authRoutes)
app.use('/api/branches',   branchRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products',   productRoutes)
app.use('/api/customers',  customerRoutes)
app.use('/api/sales',      saleRoutes)
app.use('/api/returns',    saleReturnRoutes)
app.use('/api/purchases',  purchaseRoutes)
app.use('/api/purchase-returns', purchaseReturnRoutes)
app.use('/api/suppliers',  supplierRoutes)
app.use('/api/udhaar',     udhaarRoutes)
app.use('/api/orders',     onlineOrderRoutes)
app.use('/api/staff',      staffRoutes)
app.use('/api/expenses',   expenseRoutes)
app.use('/api/analytics',  analyticsRoutes)
app.use('/api/settings',   settingsRoutes)
app.use('/api/upload',     uploadRoutes)
app.use('/api/pos',        posRoutes)
app.use('/api/audit-logs', auditLogRoutes)

app.get('/health', (_, res) => {
  const dbUp = mongoose.connection.readyState === 1
  res.status(dbUp ? 200 : 503).json({
    status:  dbUp ? 'ok' : 'degraded',
    db:      dbUp ? 'connected' : 'disconnected',
    shop:    process.env.SHOP_NAME,
    ts:      new Date(),
    version: '2.0.0',
  })
})

app.use('/api', (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` }))

app.use(errorHandler)
export default app
