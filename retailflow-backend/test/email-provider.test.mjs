import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

process.env.SHOP_NAME = 'Test Shop'
const { sendEmail, isEmailConfigured, emailProvider, transporter } = await import('../src/config/email.js')

const KEYS = ['EMAIL_PROVIDER', 'EMAIL_FROM', 'BREVO_API_KEY', 'RESEND_API_KEY', 'SMTP_USER', 'SMTP_PASS']
const realFetch = globalThis.fetch
beforeEach(() => { for (const k of KEYS) delete process.env[k]; globalThis.fetch = realFetch })

const mail = { to: 'c@x.in', subject: 'Hi', html: '<p>Hello</p>', text: 'Hello' }
const stubFetch = (status = 200, body = {}) => {
  const calls = []
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status }) }
  return calls
}

test('provider defaults: smtp only when credentials exist, else off', () => {
  assert.equal(emailProvider(), 'none'); assert.equal(isEmailConfigured(), false)
  process.env.SMTP_USER = 'a@b.co'; process.env.SMTP_PASS = 'pw'
  assert.equal(emailProvider(), 'smtp'); assert.equal(isEmailConfigured(), true)
})

test('brevo / resend need key and sender; log always works', () => {
  process.env.EMAIL_PROVIDER = 'brevo'; assert.equal(isEmailConfigured(), false)
  process.env.BREVO_API_KEY = 'k'; assert.equal(isEmailConfigured(), false)
  process.env.EMAIL_FROM = 'shop@x.in'; assert.equal(isEmailConfigured(), true)
  process.env.EMAIL_PROVIDER = 'resend'; assert.equal(isEmailConfigured(), false)
  process.env.RESEND_API_KEY = 'r'; assert.equal(isEmailConfigured(), true)
  process.env.EMAIL_PROVIDER = 'log'; delete process.env.EMAIL_FROM; assert.equal(isEmailConfigured(), true)
})

test('brevo request shape', async () => {
  Object.assign(process.env, { EMAIL_PROVIDER: 'brevo', BREVO_API_KEY: 'secret-key', EMAIL_FROM: 'shop@x.in' })
  const calls = stubFetch(201, { messageId: '1' })
  await sendEmail(mail)
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email')
  assert.equal(calls[0].init.headers['api-key'], 'secret-key')
  const b = JSON.parse(calls[0].init.body)
  assert.deepEqual(b.sender, { name: 'Test Shop', email: 'shop@x.in' })
  assert.deepEqual(b.to, [{ email: 'c@x.in' }])
  assert.equal(b.htmlContent, '<p>Hello</p>')
})

test('resend request shape', async () => {
  Object.assign(process.env, { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'rk', EMAIL_FROM: 'shop@x.in' })
  const calls = stubFetch(200, { id: '1' })
  await sendEmail(mail)
  assert.equal(calls[0].url, 'https://api.resend.com/emails')
  assert.equal(calls[0].init.headers.authorization, 'Bearer rk')
  const b = JSON.parse(calls[0].init.body)
  assert.equal(b.from, 'Test Shop <shop@x.in>'); assert.deepEqual(b.to, ['c@x.in'])
})

test('provider errors surface status/message but never the API key', async () => {
  Object.assign(process.env, { EMAIL_PROVIDER: 'brevo', BREVO_API_KEY: 'secret-key', EMAIL_FROM: 'shop@x.in' })
  stubFetch(401, { message: 'Key not found' })
  await assert.rejects(sendEmail(mail), (e) => /401/.test(e.message) && /Key not found/.test(e.message) && !e.message.includes('secret-key'))
})

test('log mode prints and makes no network call', async () => {
  process.env.EMAIL_PROVIDER = 'log'
  const calls = stubFetch()
  const lines = []; const orig = console.log; console.log = (...a) => lines.push(a.join(' '))
  try { await sendEmail(mail) } finally { console.log = orig }
  assert.equal(calls.length, 0)
  assert.ok(lines[0].includes('c@x.in') && lines[0].includes('Hello'))
})

test('smtp provider uses the transporter; unconfigured throws', async () => {
  process.env.EMAIL_PROVIDER = 'smtp'; process.env.SMTP_USER = 'a@b.co'; process.env.SMTP_PASS = 'pw'
  let sent; transporter.sendMail = async (m) => { sent = m; return {} }
  await sendEmail(mail)
  assert.equal(sent.from, '"Test Shop" <a@b.co>')
  delete process.env.SMTP_USER
  await assert.rejects(sendEmail(mail), /not configured/)
})
