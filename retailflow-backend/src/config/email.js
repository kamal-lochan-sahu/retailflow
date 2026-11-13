import nodemailer from 'nodemailer'

/**
 * Email delivery, chosen with EMAIL_PROVIDER:
 *   log     - prints the mail (incl. reset link) to the server console. For testing only, e.g. on a host
 *             that blocks outbound SMTP. Anyone who can read the logs can read the links.
 *   brevo   - Brevo HTTPS API   (BREVO_API_KEY, EMAIL_FROM)
 *   resend  - Resend HTTPS API  (RESEND_API_KEY, EMAIL_FROM)
 *   smtp    - nodemailer        (SMTP_HOST/PORT/USER/PASS)
 * Not set: "smtp" if SMTP_USER and SMTP_PASS exist (old behaviour), otherwise email is off.
 * HTTPS providers are used because many free hosts (Render free tier) block SMTP ports.
 */

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
})

const TIMEOUT_MS = 10000

export const emailProvider = () => {
  const p = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase()
  if (p) return p
  return process.env.SMTP_USER && process.env.SMTP_PASS ? 'smtp' : 'none'
}

const fromAddress = () => process.env.EMAIL_FROM || process.env.SMTP_USER || ''
const shopName    = () => process.env.SHOP_NAME || 'RetailFlow'

export const isEmailConfigured = () => {
  switch (emailProvider()) {
    case 'log':    return true
    case 'brevo':  return !!(process.env.BREVO_API_KEY && fromAddress())
    case 'resend': return !!(process.env.RESEND_API_KEY && fromAddress())
    case 'smtp':   return !!(process.env.SMTP_USER && process.env.SMTP_PASS)
    default:       return false
  }
}

// POST JSON with a timeout. Errors carry only the status and the provider's message: never the key.
const postJson = async (name, url, headers, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  if (!res.ok) {
    let detail = ''
    try { const j = await res.json(); detail = j.message || j.error || '' } catch { /* not json */ }
    throw new Error(`${name} email failed (HTTP ${res.status})${detail ? `: ${String(detail).slice(0, 200)}` : ''}`)
  }
  return res.json().catch(() => ({}))
}

export const sendEmail = async ({ to, subject, html, text }) => {
  const provider = emailProvider()
  if (!isEmailConfigured()) throw new Error(`Email not configured (EMAIL_PROVIDER=${provider})`)

  if (provider === 'log') {
    console.log(`[email:log] to=${to} subject="${subject}"\n${text || String(html).replace(/<[^>]+>/g, ' ')}`)
    return { provider }
  }
  if (provider === 'brevo') {
    return postJson('Brevo', 'https://api.brevo.com/v3/smtp/email',
      { 'api-key': process.env.BREVO_API_KEY },
      { sender: { name: shopName(), email: fromAddress() }, to: [{ email: to }], subject, htmlContent: html, textContent: text })
  }
  if (provider === 'resend') {
    return postJson('Resend', 'https://api.resend.com/emails',
      { authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      { from: `${shopName()} <${fromAddress()}>`, to: [to], subject, html, text })
  }
  if (provider === 'smtp') {
    return transporter.sendMail({ from: `"${shopName()}" <${fromAddress()}>`, to, subject, html, text })
  }
  throw new Error(`Unknown EMAIL_PROVIDER "${provider}"`)
}
