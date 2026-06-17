import Product from '../models/Product.js'
import User from '../models/User.js'
import Settings from '../models/Settings.js'
import { createNotification } from '../services/notification.service.js'
import { sendLowStockAlert } from '../utils/whatsapp.utils.js'

export const runLowStockJob = async () => {
  console.log('🕐 Running low stock job...')
  try {
    const owners = await User.find({ role: 'owner', isActive: true }).lean()

    for (const owner of owners) {
      const settings  = await Settings.findOne({ ownerId: owner._id })
      if (!settings?.notifications?.lowStock) continue

      const lowStock = await Product.find({
        ownerId:  owner._id,
        isActive: true,
        $expr: { $lte: ['$stock', '$minStock'] }
      }).lean()

      if (!lowStock.length) continue

      await createNotification({
        ownerId: owner._id,
        type:    'low_stock',
        title:   `📦 ${lowStock.length} products running low`,
        message: lowStock.slice(0,10).map(p => `${p.name}: ${p.stock} ${p.unit}`).join('
'),
        channel: 'inapp',
      })

      if (owner.branding?.phone) {
        await sendLowStockAlert(owner.branding.phone, lowStock, owner.branding.shopName).catch(() => {})
      }
    }
    console.log('✅ Low stock job done')
  } catch (err) {
    console.error('❌ Low stock job failed:', err.message)
  }
}
