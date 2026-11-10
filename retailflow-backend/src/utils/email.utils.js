import { sendEmail } from '../config/email.js'

// Names come from user input - never drop them into HTML unescaped.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))

export const sendPasswordResetEmail = async (email, name, resetUrl, shopName) => {
  return sendEmail({
    to: email,
    subject: `Password Reset — ${String(shopName ?? '').replace(/[\r\n]/g, ' ')}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
        <h2>${esc(shopName)}</h2>
        <p>Hi ${esc(name)},</p>
        <p>Click below to reset your password (expires in 1 hour):</p>
        <a href="${esc(resetUrl)}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a>
        <p style="color:#888;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
      </div>
    `
  })
}

export const sendDailyReportEmail = async (email, report, shopName) => {
  return sendEmail({
    to: email,
    subject: `Daily Sales Report — ${report.date} — ${shopName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>${shopName} — Daily Report</h2>
        <p>Date: ${report.date}</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Total Sales</td><td style="padding:8px;border:1px solid #e5e7eb"><b>₹${report.totalSales}</b></td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb">No. of Bills</td><td style="padding:8px;border:1px solid #e5e7eb"><b>${report.billCount}</b></td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Cash</td><td style="padding:8px;border:1px solid #e5e7eb">₹${report.cash}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb">UPI</td><td style="padding:8px;border:1px solid #e5e7eb">₹${report.upi}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb">Credit/Udhaar</td><td style="padding:8px;border:1px solid #e5e7eb">₹${report.credit}</td></tr>
        </table>
      </div>
    `
  })
}
