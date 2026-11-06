import http from 'http'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import app from './app.js'
import User from './src/models/User.js'
import { connectDB } from './src/config/db.js'
import { connectRedis } from './src/config/redis.js'
import { getAllowedOrigins } from './src/config/origins.js'
import { startJobs } from './src/jobs/index.js'

const PORT = process.env.PORT || 5000

// Fail fast with a readable message instead of crashing later inside a request.
const missing = ['MONGODB_URI', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'].filter(k => !process.env[k])
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) missing.push('CLIENT_URL')
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}
for (const k of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET']) {
  if (process.env[k].length < 32) console.warn(`⚠️  ${k} is shorter than 32 characters — use a long random value`)
}

const server = http.createServer(app)

export const io = new Server(server, {
  cors: { origin: getAllowedOrigins(), credentials: true }
})

// Sockets must present the same access token as the REST API, and can only ever be in
// their own shop's room (previously any client could join any shop's room).
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Access token required'))
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded._id).select('role shopOwnerId isActive')
    if (!user || !user.isActive) return next(new Error('Invalid token'))
    const shopId = user.role === 'owner' ? user._id : user.shopOwnerId
    if (!shopId) return next(new Error('Staff account is not linked to a shop'))
    socket.data.shopId = String(shopId)
    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

io.on('connection', (socket) => {
  socket.join(socket.data.shopId)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})

// Render sends SIGTERM on every deploy: stop taking requests, let in-flight ones finish.
const shutdown = (signal) => {
  console.log(`${signal} received — shutting down`)
  server.close(async () => {
    try { await mongoose.connection.close() } catch {}
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

const start = async () => {
  await connectDB()
  await connectRedis()
  startJobs()
  server.listen(PORT, () => {
    console.log(`\n🚀 RetailFlow API running on :${PORT}`)
    console.log(`   Mode: ${process.env.NODE_ENV}`)
    console.log(`   Shop: ${process.env.SHOP_NAME}\n`)
  })
}

start()
