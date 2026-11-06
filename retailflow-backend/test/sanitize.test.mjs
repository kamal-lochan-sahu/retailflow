import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeRequest } from '../src/middleware/sanitize.middleware.js'

const run = (req) => { let called = false; sanitizeRequest(req, {}, () => { called = true }); assert.ok(called); return req }

test('strips Mongo operators and dotted keys at any depth', () => {
  const r = run({ method: 'POST', body: { email: { $ne: null }, a: { b: { $gt: 1, ok: 1 } }, 'x.y': 1 }, query: { q: { $regex: '.*' } }, params: {} })
  assert.deepEqual(r.body, { email: {}, a: { b: { ok: 1 } } })
  assert.deepEqual(r.query, { q: {} })
})

test('strips fields a client must never set on writes', () => {
  const r = run({ method: 'PUT', body: { name: 'x', ownerId: 'other', isDeleted: false, createdAt: 1, refreshTokens: ['a'], stock: 5 }, query: {}, params: {} })
  assert.deepEqual(r.body, { name: 'x', stock: 5 })
})

test('keeps login/refresh fields and leaves GET bodies alone', () => {
  assert.deepEqual(run({ method: 'POST', body: { password: 'p', refreshToken: 't' }, query: {}, params: {} }).body, { password: 'p', refreshToken: 't' })
  assert.deepEqual(run({ method: 'GET', body: { ownerId: 'x' }, query: {}, params: {} }).body, { ownerId: 'x' })
})
