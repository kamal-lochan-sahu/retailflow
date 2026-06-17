import Notification from '../models/Notification.js'
import { sendWhatsApp, sendSMS } from '../config/twilio.js'
import { sendEmail } from '../config/email.js'

export const createNotification = async ({ ownerId, type, title, message, channel='inapp', productId, customerId }) => {
  const notif = await Notification.create({ ownerId, type, title, message, channel, productId, customerId, status:'pending' })
  try {
    // additional channel dispatch can be triggered here
    await Notification.findByIdAndUpdate(notif._id, { status: 'sent' })
  } catch (err) {
    await Notification.findByIdAndUpdate(notif._id, { status: 'failed', error: err.message })
  }
  return notif
}

export const markRead = async (ownerId, notifId) => {
  return Notification.findOneAndUpdate(
    { _id: notifId, ownerId },
    { isRead: true, readAt: new Date(), status: 'read' },
    { new: true }
  )
}

export const getUnread = async (ownerId) => {
  return Notification.find({ ownerId, isRead: false }).sort({ createdAt: -1 }).limit(20)
}
