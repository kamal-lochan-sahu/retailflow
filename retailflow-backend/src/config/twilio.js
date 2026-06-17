import twilio from 'twilio'

let client = null
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  }
} catch {}

export const sendWhatsApp = async (to, message) => {
  if (!client) return console.warn('Twilio not configured')
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to:   `whatsapp:${to}`,
    body: message
  })
}

export const sendSMS = async (to, message) => {
  if (!client) return console.warn('Twilio not configured')
  return client.messages.create({
    from: process.env.TWILIO_PHONE,
    to, body: message
  })
}

export default client
