import ProductBatch from '../models/ProductBatch.js'
import User from '../models/User.js'
import { createNotification } from '../services/notification.service.js'
import { sendWhatsApp } from '../config/twilio.js'
import Settings from '../models/Settings.js'
import dayjs from 'dayjs'

export const runExpiryAlertJob = async () => {
  console.log('🕐 Running expiry alert job...')
  try {
    const owners = await User.find({ role: 'owner', isActive: true }).lean()

    for (const owner of owners) {
      const settings  = await Settings.findOne({ ownerId: owner._id })
      const alertDays = settings?.stock?.expiryAlertDays || [30, 15, 7]
      const maxDays   = Math.max(...alertDays)
      const cutoff    = dayjs().add(maxDays, 'day').toDate()

      const expiring = await ProductBatch.find({
        ownerId:      owner._id,
        expiryDate:   { $lte: cutoff },
        remainingQty: { $gt: 0 },
        isExpired:    false,
      }).populate('productId', 'name sku')

      if (!expiring.length) continue

      const criticalItems = expiring.filter(b => dayjs(b.expiryDate).diff(dayjs(), 'day') <= 7)

      if (criticalItems.length > 0) {
        await createNotification({
          ownerId: owner._id,
          type:    'expiry',
          title:   `⚠️ ${criticalItems.length} products expiring within 7 days`,
          message: criticalItems.map(b => `${b.productId?.name} — Batch: ${b.batchNumber} — Exp: ${dayjs(b.expiryDate).format('DD/MM/YYYY')}`).join('
'),
          channel: 'inapp',
        })

        if (settings?.notifications?.expiryAlert && owner.branding?.phone) {
          const lines = criticalItems.slice(0,5).map(b =>
            `• ${b.productId?.name} (${dayjs(b.expiryDate).format('DD MMM')})`
          ).join('
')
          await sendWhatsApp(owner.branding.phone,
            `⚠️ *Expiry Alert — ${owner.branding.shopName}*

${lines}

Please check stock immediately.`
          ).catch(() => {})
        }
      }
    }
    console.log('✅ Expiry alert job done')
  } catch (err) {
    console.error('❌ Expiry alert job failed:', err.message)
  }
}
