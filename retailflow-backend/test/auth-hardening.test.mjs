import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

process.env.REDIS_URL = 'disabled'
process.env.JWT_SECRET ||= 'x'.repeat(32)
process.env.REFRESH_TOKEN_SECRET ||= 'y'.repeat(32)

const { default: User } = await import('../src/models/User.js')
const { registrationOpen } = await import('../src/utils/registration.utils.js')
const { changePassword, register } = await import('../src/controllers/auth.controller.js')
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')

const withEnv = async (env, count, fn) => {
  const saved = { A: process.env.ALLOW_REGISTRATION, N: process.env.NODE_ENV }
  for (const [k, v] of Object.entries(env)) v === undefined ? delete process.env[k] : (process.env[k] = v)
  User.estimatedDocumentCount = async () => count
  try { return await fn() } finally {
    saved.A === undefined ? delete process.env.ALLOW_REGISTRATION : (process.env.ALLOW_REGISTRATION = saved.A)
    saved.N === undefined ? delete process.env.NODE_ENV : (process.env.NODE_ENV = saved.N)
  }
}

test('registration: production default is closed once a user exists, open for the first owner', async () => {
  assert.equal(await withEnv({ NODE_ENV: 'production', ALLOW_REGISTRATION: undefined }, 3, registrationOpen), false)
  assert.equal(await withEnv({ NODE_ENV: 'production', ALLOW_REGISTRATION: undefined }, 0, registrationOpen), true)
  assert.equal(await withEnv({ NODE_ENV: 'production', ALLOW_REGISTRATION: 'false' }, 3, registrationOpen), false)
})

test('registration: explicit true opens it; dev default is open', async () => {
  assert.equal(await withEnv({ NODE_ENV: 'production', ALLOW_REGISTRATION: 'true' }, 3, registrationOpen), true)
  assert.equal(await withEnv({ NODE_ENV: 'development', ALLOW_REGISTRATION: undefined }, 3, registrationOpen), true)
})

test('register endpoint answers 403 when closed (before touching the database)', async () => {
  await withEnv({ NODE_ENV: 'production', ALLOW_REGISTRATION: 'false' }, 2, async () => {
    let err
    await register({ body: { name: 'a', email: 'a@b.co', password: 'password1' } }, {}, (e) => { err = e })
    assert.equal(err.statusCode, 403)
  })
})

const callChange = async (body, sessions) => {
  const doc = { _id: 'u1', isPasswordCorrect: async (p) => p === 'oldpass123', saveCalls: 0, async save() { this.saveCalls++ } }
  User.findById = () => ({ select: async (s) => (s === '+password' ? doc : { refreshTokens: sessions }) })
  let err, out
  await changePassword({ user: { _id: 'u1' }, body }, { json: (x) => { out = x } }, (e) => { err = e })
  return { doc, err, out }
}

test('change password: wrong current / same password are rejected and nothing is saved', async () => {
  let r = await callChange({ currentPassword: 'nope', newPassword: 'newpass123' }, [])
  assert.equal(r.err.statusCode, 400); assert.equal(r.doc.saveCalls, 0)
  r = await callChange({ currentPassword: 'oldpass123', newPassword: 'oldpass123' }, [])
  assert.equal(r.err.statusCode, 400); assert.equal(r.doc.saveCalls, 0)
})

test('change password: keeps only the calling device signed in, signs out the rest', async () => {
  const r = await callChange({ currentPassword: 'oldpass123', newPassword: 'newpass123', refreshToken: 'mine' }, [sha('mine'), sha('phone'), sha('laptop')])
  assert.equal(r.err, undefined)
  assert.deepEqual(r.doc.refreshTokens, [sha('mine')])
  assert.equal(r.doc.password, 'newpass123')
  assert.equal(r.doc.saveCalls, 1)
})

test('change password: unknown / missing refresh token signs out everywhere', async () => {
  let r = await callChange({ currentPassword: 'oldpass123', newPassword: 'newpass123', refreshToken: 'forged' }, [sha('phone')])
  assert.deepEqual(r.doc.refreshTokens, [])
  r = await callChange({ currentPassword: 'oldpass123', newPassword: 'newpass123' }, [sha('phone')])
  assert.deepEqual(r.doc.refreshTokens, [])
})
