import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as S from '../src/validators/update.validator.js'
import { validateUpdate } from '../src/middleware/validate.middleware.js'

const run = (schema, body) => {
  const req = { body }
  let err = null
  try { validateUpdate(schema)(req, {}, () => {}) } catch (e) { err = e }
  return { req, err }
}

test('empty update body is rejected', () => {
  assert.equal(run(S.updateProductSchema, {}).err?.statusCode, 400)
})

test('unknown / protected fields are stripped, not passed to the controller', () => {
  const { req, err } = run(S.updateSupplierSchema, { name: 'ABC', outstandingBalance: 0, totalPurchased: 99, ownerId: 'x', isDeleted: true })
  assert.equal(err, null)
  assert.deepEqual(req.body, { name: 'ABC' })
})

test('no defaults leak in: a partial update stays partial', () => {
  const { req } = run(S.updateProductSchema, { name: 'Rice' })
  assert.deepEqual(req.body, { name: 'Rice' })
})

test('EditProduct form payload passes (strings coerced, empty category -> null kept as null)', () => {
  const { req, err } = run(S.updateProductSchema, {
    name: 'Basmati', brand: '', sku: '', barcode: '', description: '', category: null, images: [],
    sellingPrice: 120, mrp: 130, purchasePrice: 100, stock: 10, minStock: 5, unit: 'kg', gstPercent: 5, hsnCode: '',
  })
  assert.equal(err, null)
  assert.equal(req.body.category, null)
  assert.equal(run(S.updateProductSchema, { sellingPrice: -1 }).err?.statusCode, 400)
  assert.equal(run(S.updateProductSchema, { gstPercent: 7 }).err?.statusCode, 400)
})

test('customer edit form passes; money counters are stripped; bad GSTIN rejected', () => {
  const ok = run(S.updateCustomerSchema, { name: 'Ram', phone: '', email: '', address: '', gstin: '', type: 'vip', creditLimit: '500', notes: '', isBlocked: false, outstandingBalance: 0 })
  assert.equal(ok.err, null)
  assert.equal(ok.req.body.creditLimit, 500)
  assert.equal('outstandingBalance' in ok.req.body, false)
  assert.equal(run(S.updateCustomerSchema, { gstin: '123' }).err?.statusCode, 400)
  assert.equal(run(S.updateCustomerSchema, { gstin: '27aaapl1234c1zv' }).req.body.gstin, '27AAAPL1234C1ZV')
})

test('staff: toggle payload and edit payload pass; owner role rejected', () => {
  assert.equal(run(S.updateStaffSchema, { isActive: false }).err, null)
  assert.equal(run(S.updateStaffSchema, { name: 'A B', phone: '', role: 'cashier', designation: 'x', salary: { amount: 9000, type: 'monthly' } }).err, null)
  assert.equal(run(S.updateStaffSchema, { role: 'owner' }).err?.statusCode, 400)
})

test('settings: form payload passes; invalid values rejected', () => {
  const ok = run(S.updateSettingsSchema, { shop: { name: 'Sharma', phone: '', email: '', address: '', gstin: '' }, billing: { thankYouMessage: 'Thanks', prefix: 'inv', footerText: '' }, stock: { defaultLowStockThreshold: 5 } })
  assert.equal(ok.err, null)
  assert.equal(ok.req.body.billing.prefix, 'INV')
  assert.equal(run(S.updateSettingsSchema, { shop: { gstin: 'nope' } }).err?.statusCode, 400)
  assert.equal(run(S.updateSettingsSchema, { branding: { primaryColor: 'red' } }).err?.statusCode, 400)
})

test('purchase update cannot jump to received; order status limited to enum', () => {
  assert.equal(run(S.updatePurchaseSchema, { status: 'received' }).err?.statusCode, 400)
  assert.equal(run(S.updateOrderStatusSchema, { status: 'teleported' }).err?.statusCode, 400)
  assert.equal(run(S.updateOrderStatusSchema, { status: 'packed' }).err, null)
})
