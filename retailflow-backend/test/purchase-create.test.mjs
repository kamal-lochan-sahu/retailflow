import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.REDIS_URL = 'disabled'
process.env.JWT_SECRET ||= 'x'.repeat(32)
process.env.REFRESH_TOKEN_SECRET ||= 'y'.repeat(32)

const { default: Purchase } = await import('../src/models/Purchase.js')
const { default: Product }  = await import('../src/models/Product.js')
const { default: Supplier } = await import('../src/models/Supplier.js')
const { default: ProductBatch } = await import('../src/models/ProductBatch.js')
const { createPurchaseSchema } = await import('../src/validators/purchase.validator.js')
const { createProductSchema }  = await import('../src/validators/product.validator.js')
const { validateStrict } = await import('../src/middleware/validate.middleware.js')
const { computePurchaseTotals } = await import('../src/utils/purchaseTotals.utils.js')
const { createPurchase, receivePurchase } = await import('../src/controllers/purchase.controller.js')

const OID = (n) => String(n).repeat(24).slice(0, 24)
const clean = (schema, body) => { const req = { body }; validateStrict(schema)(req, {}, () => {}); return req.body }

test('totals helper: qty x price, GST not added on top (matches the Add Purchase screen)', () => {
  assert.deepEqual(computePurchaseTotals([{ quantity: 10, purchasePrice: 50, gstPercent: 18 }, { quantity: 2, purchasePrice: 12.5 }]),
    { subtotal: 525, gstAmount: 0, totalAmount: 525 })
})

test('purchase create body: client-sent status / totals / payment fields are stripped', () => {
  const b = clean(createPurchaseSchema, {
    supplierId: OID(1), notes: '', status: 'received', paidAmount: 999, subtotal: 1, totalAmount: 1, dueAmount: 0, ownerId: OID(9),
    items: [{ productId: OID(2), quantity: 2, purchasePrice: 5, mrp: 0, sellingPrice: 0, gstPercent: 0, evil: true }],
  })
  for (const k of ['status', 'paidAmount', 'subtotal', 'totalAmount', 'dueAmount', 'ownerId']) assert.equal(k in b, false, k)
  assert.equal('evil' in b.items[0], false)
  assert.equal(b.supplierId, OID(1))
})

test('exact Add Purchase payload (blank optional fields, undefined supplier) still validates', () => {
  const b = clean(createPurchaseSchema, { items: [{ productId: OID(2), quantity: 1, purchasePrice: 10, mrp: 0, sellingPrice: 0, gstPercent: 0 }], notes: '', status: 'draft', subtotal: 10, totalAmount: 10, dueAmount: 10 })
  assert.equal(b.items.length, 1)
})

test('product create: AddProduct payload passes, extra legit fields kept, protected fields stripped', () => {
  const b = clean(createProductSchema, { name: 'Rice', sellingPrice: 100, mrp: 0, purchasePrice: 0, stock: 5, minStock: 5, gstPercent: 5, category: '', hsnCode: '', tags: ['a'], isActive: false, isDeleted: true, ownerId: OID(9), rating: 5 })
  assert.deepEqual(b.tags, ['a'])
  for (const k of ['isActive', 'isDeleted', 'ownerId', 'rating']) assert.equal(k in b, false, k)
})

test('createPurchase: server decides status + totals', async () => {
  let saved
  Product.countDocuments = async () => 1
  Supplier.exists = async () => ({ _id: 1 })
  Purchase.create = async (doc) => { saved = doc; return doc }
  // generateBillNumber talks to Mongo: stub every model's findOneAndUpdate (its counter lookup)
  const mongoose = (await import('mongoose')).default
  for (const m of Object.values(mongoose.models)) { m.findOneAndUpdate = async () => ({ seq: 1, value: 1 }); }
  const body = clean(createPurchaseSchema, { items: [{ productId: OID(2), quantity: 10, purchasePrice: 50 }], status: 'received', totalAmount: 1 })
  let err
  await createPurchase({ scopeOwnerId: OID(5), body }, { status() { return this }, json() {} }, (e) => { err = e })
  if (err) { assert.fail('controller error: ' + err.message) }
  assert.equal(saved.status, 'draft'); assert.equal(saved.totalAmount, 500); assert.equal(saved.dueAmount, 500); assert.equal(saved.paidAmount, 0)
  assert.equal(String(saved.ownerId), OID(5))
})

test('createPurchase rejects products from another shop', async () => {
  Product.countDocuments = async () => 0
  let err
  await createPurchase({ scopeOwnerId: OID(5), body: { items: [{ productId: OID(2), quantity: 1, purchasePrice: 1 }] } }, {}, (e) => { err = e })
  assert.equal(err.statusCode, 400)
})

const recv = async ({ status, claim = true, bulkFails = false }) => {
  const calls = { bulk: null, rollback: null, supplier: null }
  Purchase.findOne = () => ({ select: async () => ({ _id: 'p1', status }) })
  Purchase.findOneAndUpdate = async () => claim ? { _id: 'p1', status: 'received', supplierId: OID(3), totalAmount: 10, dueAmount: 10, items: [{ productId: OID(2), quantity: 3, purchasePrice: 4 }] } : null
  Purchase.updateOne = async (...a) => { calls.rollback = a }
  Product.bulkWrite = async (ops) => { if (bulkFails) throw new Error('db down'); calls.bulk = ops }
  ProductBatch.insertMany = async () => {}
  Supplier.findOneAndUpdate = async (...a) => { calls.supplier = a }
  let err
  await receivePurchase({ params: { id: 'p1' }, scopeOwnerId: OID(5), user: { _id: 'u' } }, { json() {} }, (e) => { err = e })
  return { err, calls }
}

test('receive: stock + supplier writes are scoped to the owner', async () => {
  const { err, calls } = await recv({ status: 'draft' })
  assert.equal(err, undefined)
  assert.equal(String(calls.bulk[0].updateOne.filter.ownerId), OID(5))
  assert.equal(String(calls.supplier[0].ownerId), OID(5))
})

test('receive: cancelled / already-received / lost-race purchases are refused', async () => {
  assert.equal((await recv({ status: 'cancelled' })).err.statusCode, 400)
  assert.equal((await recv({ status: 'received' })).err.statusCode, 400)
  const lost = await recv({ status: 'draft', claim: false })
  assert.equal(lost.err.statusCode, 400); assert.equal(lost.calls.bulk, null)
})

test('receive: if stock update fails the claim is released', async () => {
  const { err, calls } = await recv({ status: 'sent', bulkFails: true })
  assert.equal(err.message, 'db down')
  assert.equal(calls.rollback[1].$set.status, 'sent')
})
