import { sendWhatsApp } from '../config/twilio.js'

export const sendBillWhatsApp = async (phone, billData) => {
  const { billNumber, items, total, shopName } = billData
  const itemLines = items.map(i => `  ${i.name} x${i.quantity} — ₹${i.total}`).join('\n')
  const msg = `🛒 *${shopName}*\n\nBill No: ${billNumber}\n\nItems:\n${itemLines}\n\n*Total: ₹${total}*\n\nThank you for shopping with us! 🙏`
  return sendWhatsApp(phone, msg)
}

export const sendUdhaarReminder = async (phone, customerName, amount, shopName) => {
  const msg = `Dear ${customerName},\n\nYou have an outstanding balance of *₹${amount}* at *${shopName}*.\n\nPlease settle at your earliest convenience.\n\nThank you!`
  return sendWhatsApp(phone, msg)
}

export const sendLowStockAlert = async (phone, products, shopName) => {
  const lines = products.slice(0, 5).map(p => `  • ${p.name}: ${p.stock} ${p.unit}`).join('\n')
  const msg = `⚠️ *${shopName} — Low Stock Alert*\n\n${lines}${products.length > 5 ? `\n  ...and ${products.length - 5} more` : ''}\n\nPlease reorder soon.`
  return sendWhatsApp(phone, msg)
}

export const sendOrderStatusWhatsApp = async (phone, order, shopName) => {
  const statusEmoji = { confirmed:'✅', packed:'📦', out_for_delivery:'🚚', delivered:'🎉' }
  const msg = `${statusEmoji[order.status] || '📋'} *${shopName}*\n\nOrder #${order.orderId}\nStatus: *${order.status.replace(/_/g,' ').toUpperCase()}*\n\nTotal: ₹${order.total}\n\nThank you for your order!`
  return sendWhatsApp(phone, msg)
}
