import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGstr1, periodRange, fmtDate } from '../src/utils/gstr1.utils.js'

const shop = '21ABCDE1234F1Z5'
const prods = { p1: { hsnCode: '1006', unit: 'kg' }, p2: { hsnCode: '3304', unit: 'piece' }, p3: { hsnCode: '', unit: 'piece' } }
const line = (productId, name, quantity, total, gstPercent, unit = 'piece') =>
  ({ productId, name, quantity, unit, total, gstPercent, gstAmount: +(total * gstPercent / 100).toFixed(2) })
const intra = { gstin: '21AAPFU0939F1ZV' }
const inter = { gstin: '29AAPFU0939F1ZV' }

const sales = [
  { _id: 's1', billNumber: 'INV-261101-0001', createdAt: new Date('2026-10-31T19:00:00Z'), status: 'completed', totalAmount: 236, customerId: intra, items: [line('p2', 'Cream', 2, 200, 18)] },
  { _id: 's2', billNumber: 'INV-261101-0002', createdAt: new Date('2026-11-01T05:00:00Z'), status: 'completed', totalAmount: 105, customerId: null, items: [line('p1', 'Rice', 1, 100, 5, 'kg')] },
  { _id: 's3', billNumber: 'INV-261102-0001', createdAt: new Date('2026-11-02T05:00:00Z'), status: 'completed', totalAmount: 118, customerId: inter, items: [line('p2', 'Cream', 1, 100, 18)] },
  { _id: 's4', billNumber: 'INV-20261103-0001', createdAt: new Date('2026-11-03T05:00:00Z'), status: 'completed', totalAmount: 50, items: [line('p3', 'Mystery', 1, 50, 0)] },
  { _id: 's5', billNumber: 'INV-261104-0001', createdAt: new Date('2026-11-04T05:00:00Z'), status: 'void', totalAmount: 50, items: [line('p1', 'Rice', 1, 50, 5)] },
]
const returns = [{ saleId: 's1', returnNumber: 'RTN-261105-0001', createdAt: new Date('2026-11-05T05:00:00Z'), totalAmount: 118, items: [{ productId: 'p2', amount: 118 }] }]
const byId = Object.fromEntries(sales.map(s => [s._id, s]))
const run = () => buildGstr1({ shopGstin: shop, month: 11, year: 2026, sales, returns, origSalesById: byId, productById: prods })

test('IST month boundaries', () => {
  const { start, end } = periodRange(11, 2026)
  assert.equal(start.toISOString(), '2026-10-31T18:30:00.000Z')
  assert.equal(end.toISOString(), '2026-11-30T18:30:00.000Z')
  assert.equal(fmtDate('2026-11-30T18:29:59Z'), '30-11-2026')
  assert.equal(fmtDate('2026-11-30T18:30:00Z'), '01-12-2026')
})

test('B2B intra-state splits CGST/SGST, inter-state uses IGST', () => {
  const { json } = run()
  const a = json.b2b.find(x => x.ctin === intra.gstin).inv[0]
  assert.equal(a.idt, '01-11-2026')                       // 00:30 IST on the 1st
  assert.deepEqual(a.itms[0].itm_det, { rt: 18, txval: 200, camt: 18, samt: 18, csamt: 0 })
  const b = json.b2b.find(x => x.ctin === inter.gstin).inv[0]
  assert.equal(b.pos, '29')
  assert.deepEqual(b.itms[0].itm_det, { rt: 18, txval: 100, iamt: 18, csamt: 0 })
})

test('unregistered sales go to B2CS; 0% lines go to nil', () => {
  const { json } = run()
  assert.deepEqual(json.b2cs.find(r => r.rt === 5), { sply_ty: 'INTRA', pos: '21', typ: 'OE', rt: 5, txval: 100, camt: 2.5, samt: 2.5, csamt: 0 })
  assert.equal(json.nil.inv[0].sply_ty, 'INTRAB2C')
})

test('B2B return becomes a credit note with tax backed out of the refund', () => {
  const { json } = run()
  const nt = json.cdnr[0].nt[0]
  assert.equal(nt.ntty, 'C'); assert.equal(nt.val, 118)
  assert.deepEqual(nt.itms[0].itm_det, { rt: 18, txval: 100, camt: 9, samt: 9, csamt: 0 })
})

test('document ranges count void bills as cancelled', () => {
  const d = run().json.doc_issue.doc_det[0].docs[0]
  assert.equal(d.totnum, 5); assert.equal(d.cancel, 1); assert.equal(d.net_issue, 4)
})

test('flags invoice numbers over 16 chars and products without HSN', () => {
  const msgs = run().issues.map(i => `${i.severity}:${i.message}`)
  assert.ok(msgs.some(m => m.startsWith('error:Invoice numbers GSTN will reject')))
  assert.ok(msgs.some(m => m.startsWith('error:Products with no HSN')))
})

test('empty period still produces a valid header', () => {
  const { json, summary } = buildGstr1({ shopGstin: shop, month: 1, year: 2020 })
  assert.equal(json.fp, '012020'); assert.equal(summary.invoices, 0)
})
