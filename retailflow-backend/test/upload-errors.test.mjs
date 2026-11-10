import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.NODE_ENV = 'production'
const { errorHandler } = await import('../src/middleware/error.middleware.js')
const { ApiError } = await import('../src/utils/ApiError.js')

const handle = (err) => { let out = {}; const res = { status(c) { out.status = c; return this }, json(b) { out.body = b } }; errorHandler(err, { method: 'POST', originalUrl: '/x' }, res, () => {}); return out }

test('file too large -> 413 with a readable message', () => {
  const e = Object.assign(new Error('File too large'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' })
  const r = handle(e)
  assert.equal(r.status, 413); assert.match(r.body.message, /max 5MB/)
})

test('other multer errors -> 400', () => {
  assert.equal(handle(Object.assign(new Error('Unexpected field'), { name: 'MulterError', code: 'LIMIT_UNEXPECTED_FILE' })).status, 400)
})

test('cloudinary 4xx (file refused upstream) -> 400, not a 500', () => {
  const r = handle(Object.assign(new Error('Invalid image file'), { http_code: 400 }))
  assert.equal(r.status, 400); assert.match(r.body.message, /could not be processed/)
})

test('real server errors still hide internals in production', () => {
  const r = handle(new Error('boom: mongodb://secret'))
  assert.equal(r.status, 500); assert.equal(r.body.message, 'Internal server error')
})

test('ApiError from the file filter passes through unchanged', () => {
  const r = handle(new ApiError(400, 'Only JPG, PNG or WebP images are allowed'))
  assert.equal(r.status, 400); assert.match(r.body.message, /JPG, PNG or WebP/)
})
