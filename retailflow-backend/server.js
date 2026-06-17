import http from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import { connectDB } from './src/config/db.js'
import { connectRedis } from './src/config/redis.js'
import { startJobs } from './src/jobs/index.js'

const PORT = process.env.PORT || 5000

const server = http.createServer(app)

export const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
})

io.on('connection', (socket) => {
  socket.on('join_shop', (ownerId) => socket.join(ownerId))
  socket.on('disconnect', () => {})
})

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
