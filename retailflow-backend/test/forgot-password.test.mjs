import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.REDIS_URL = 'disabled'
process.env.JWT_SECRET ||= 'x'.repeat(32)
process.env.REFRESH_TOKEN_SECRET ||= 'y'.repeat(32)
process.env.CLIENT_URL = 'https://app.example.com'
process.env.SHOP_NAME = 'Test Shop'

const { default: User } = await import('../src/models/User.js')
const { transporter } = await import('../src/config/email.js')
delete process.env.EMAIL_PROVIDER
const { forgotPassword } = await import('../src/controllers/auth.controller.js')

const run = async ({ found, smtp = true, sendFails = false }) => {
  if (smtp) { process.env.SMTP_USER = 'a@b.co'; process.env.SMTP_PASS = 'pw' } else { delete process.env.SMTP_USER; delete process.env.SMTP_PASS }
  const sent = []
  transporter.sendMail = async (m) => { if (sendFails) throw new Error('smtp down'); sent.push(m); return {} }
  const doc = found && { email: 'o@x.in', name: '<b>Evil</b>', async save() { this.saved = true } }
  let query
  User.findOne = async (q) => { query = q; return doc || null }
  let out, err
  await forgotPassword({ body: { email: ' O@X.in ' } }, { json: (x) => { out = x } }, (e) => { err = e })
  return { out, err, sent, doc, query }
}

test('unknown email, known email, SMTP down and SMTP missing all get the identical reply', async () => {
  const replies = []
  for (const o of [{ found: false }, { found: true }, { found: true, sendFails: true }, { found: true, smtp: false }]) {
    const r = await run(o)
    assert.equal(r.err, undefined)
    replies.push(JSON.stringify(r.out))
  }
  assert.equal(new Set(replies).size, 1)
})

test('lookup is case/space-normalised and limited to active users', async () => {
  const r = await run({ found: false })
  assert.deepEqual(r.query, { email: 'o@x.in', isActive: true })
})

test('known user: hashed token stored, email sent once with an escaped name', async () => {
  const r = await run({ found: true })
  assert.equal(r.sent.length, 1)
  assert.match(r.doc.resetToken, /^[0-9a-f]{64}$/)
  assert.ok(r.doc.saved)
  assert.match(r.sent[0].html, /https:\/\/app\.example\.com\/reset-password\/[0-9a-f]{64}/)
  assert.ok(!r.sent[0].html.includes('<b>Evil</b>'))
  assert.ok(r.sent[0].html.includes('&lt;b&gt;Evil&lt;/b&gt;'))
  assert.ok(!r.sent[0].html.includes(r.doc.resetToken))   // the stored value is the hash, not the emailed token
})

test('unknown user and unconfigured SMTP send nothing', async () => {
  assert.equal((await run({ found: false })).sent.length, 0)
  assert.equal((await run({ found: true, smtp: false })).sent.length, 0)
})
