import Customer from '../models/Customer.js'
import User from '../models/User.js'
import Settings from '../models/Settings.js'
import { sendUdhaarReminder } from '../utils/whatsapp.utils.js'

export const runUdhaarReminderJob = async () => {
  console.log('🕐 Running udhaar reminder job...')
  try {
    const owners = await User.find({ role: 'owner', isActive: true }).lean()

    for (const owner of owners) {
      const settings = await Settings.findOne({ ownerId: owner._id })
      if (!settings?.notifications?.udharReminder) continue
      if (!settings?.features?.udhaarSystem) continue

      const defaulters = await Customer.find({
        ownerId:            owner._id,
        outstandingBalance: { $gt: 0 },
        isBlocked:          false,
        phone:              { $exists: true, $ne: '' }
      }).lean()

      for (const customer of defaulters) {
        await sendUdhaarReminder(
          customer.phone,
          customer.name,
          customer.outstandingBalance,
          owner.branding?.shopName || process.env.SHOP_NAME
        ).catch(() => {})
        await new Promise(r => setTimeout(r, 500)) // rate limit
      }
    }
    console.log('✅ Udhaar reminder job done')
  } catch (err) {
    console.error('❌ Udhaar reminder job failed:', err.message)
  }
}
