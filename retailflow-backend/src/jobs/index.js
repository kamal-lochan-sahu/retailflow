import cron from 'node-cron'

let jobsStarted = false

export const startJobs = () => {
  if (jobsStarted) return
  jobsStarted = true

  // Expiry alert — daily 8 AM
  cron.schedule('0 8 * * *', async () => {
    const { runExpiryAlertJob } = await import('./expiryAlert.job.js')
    runExpiryAlertJob()
  })

  // Low stock alert — daily 9 AM
  cron.schedule('0 9 * * *', async () => {
    const { runLowStockJob } = await import('./lowStockAlert.job.js')
    runLowStockJob()
  })

  // Udhaar reminder — Mon + Thu 10 AM
  cron.schedule('0 10 * * 1,4', async () => {
    const { runUdhaarReminderJob } = await import('./udhaarReminder.job.js')
    runUdhaarReminderJob()
  })

  // Daily report — midnight
  cron.schedule('0 0 * * *', async () => {
    const { runDailyReportJob } = await import('./dailyReport.job.js')
    runDailyReportJob()
  })

  console.log('✅ Cron jobs started')
}
