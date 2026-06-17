import User from '../models/User.js'
import Settings from '../models/Settings.js'
import { buildDailyReport } from '../services/report.service.js'
import { sendDailyReportEmail } from '../utils/email.utils.js'
import { sendWhatsApp } from '../config/twilio.js'

export const runDailyReportJob = async () => {
  console.log('🕐 Running daily report job...')
  try {
    const owners = await User.find({ role: 'owner', isActive: true }).lean()

    for (const owner of owners) {
      const settings = await Settings.findOne({ ownerId: owner._id })
      if (!settings?.notifications?.dailyReport) continue

      const report = await buildDailyReport(owner._id)

      const reportEmail = settings.notifications.reportEmail || owner.email
      if (reportEmail) {
        await sendDailyReportEmail(reportEmail, report, owner.branding?.shopName).catch(() => {})
      }

      const alertPhone = settings.notifications.alertPhone || owner.branding?.phone
      if (alertPhone) {
        const msg = `📊 *Daily Report — ${report.date}*

Sales: ₹${report.totalSales}
Bills: ${report.billCount}
Cash: ₹${report.cash} | UPI: ₹${report.upi}
Expenses: ₹${report.expenses}`
        await sendWhatsApp(alertPhone, msg).catch(() => {})
      }
    }
    console.log('✅ Daily report job done')
  } catch (err) {
    console.error('❌ Daily report job failed:', err.message)
  }
}
