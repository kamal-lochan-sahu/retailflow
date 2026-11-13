#!/usr/bin/env node
/**
 * Removes test/demo records from ONE shop and puts stock and balances back the way they were.
 * Dry-run by default: it only prints what it would do. Add --apply to really delete.
 *
 *   node scripts/cleanup-test-data.js --owner you@shop.com
 *   node scripts/cleanup-test-data.js --owner you@shop.com --match "ZZ B,GST Test" --bills INV-261108-0001,INV-261111-0001,RTN-261108-0001 --staff testcashier123@retailflow.in
 *   ... same line + --apply
 *
 * --owner   (required) email of the shop owner. Nothing outside this shop is touched.
 * --match   comma list of name prefixes (case-insensitive). Customers, suppliers, products, expenses (description)
 *           and staff (name) starting with one of these are test data.  Default: "ZZ B"
 * --bills   extra sale bill numbers / return numbers to remove (sales rung up on real customers/products)
 * --pos     extra purchase PO numbers to remove (purchases of real suppliers)
 * --staff   extra staff emails to remove
 * Reads MONGODB_URI from the environment or .env. Take an Atlas backup/snapshot before --apply.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import Staff from '../src/models/Staff.js'
import Customer from '../src/models/Customer.js'
import Supplier from '../src/models/Supplier.js'
import Product from '../src/models/Product.js'
import ProductBatch from '../src/models/ProductBatch.js'
import ProductVariant from '../src/models/ProductVariant.js'
import Expense from '../src/models/Expense.js'
import Sale from '../src/models/Sale.js'
import SaleReturn from '../src/models/SaleReturn.js'
import Purchase from '../src/models/Purchase.js'
import UdhaarLedger from '../src/models/UdhaarLedger.js'
import AuditLog from '../src/models/AuditLog.js'

const argv = process.argv.slice(2)
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined }
const list = (n) => (arg(n) || '').split(',').map(s => s.trim()).filter(Boolean)
const APPLY = argv.includes('--apply')
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const ownerEmail = arg('owner')
if (!ownerEmail) { console.error('Missing --owner <email>'); process.exit(1) }
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1) }
const prefixes = list('match').length ? list('match') : ['ZZ B']
const nameRe = new RegExp('^(' + prefixes.map(esc).join('|') + ')', 'i')
const bills = list('bills'), poNumbers = list('pos'), staffEmails = list('staff').map(s => s.toLowerCase())

const ids = (docs) => docs.map(d => d._id)
const sid = (x) => String(x)
const log = (...a) => console.log(...a)

await mongoose.connect(process.env.MONGODB_URI)
const owner = await User.findOne({ email: ownerEmail.toLowerCase().trim(), role: 'owner' })
if (!owner) { console.error(`No owner with email ${ownerEmail}`); process.exit(1) }
const ownerId = owner._id

// ── 1. What counts as test data ──────────────────────────────
const customers = await Customer.find({ ownerId, name: nameRe })
const suppliers = await Supplier.find({ ownerId, name: nameRe })
const products  = await Product.find({ ownerId, name: nameRe })
const expenses  = await Expense.find({ ownerId, description: nameRe })
const staffUsers = await User.find({
  shopOwnerId: ownerId, role: { $ne: 'owner' },
  $or: [{ name: nameRe }, ...(staffEmails.length ? [{ email: { $in: staffEmails } }] : [])],
})
const staffDocs = await Staff.find({ ownerId, userId: { $in: ids(staffUsers) } })

const custIds = ids(customers), prodIds = ids(products), suppIds = ids(suppliers)
const prodSet = new Set(prodIds.map(sid)), custSet = new Set(custIds.map(sid))

const sales = await Sale.find({ ownerId, $or: [
  { customerId: { $in: custIds } }, { 'items.productId': { $in: prodIds } },
  ...(bills.length ? [{ billNumber: { $in: bills } }] : []),
] })
const saleIds = ids(sales)
const returns = await SaleReturn.find({ ownerId, $or: [
  { saleId: { $in: saleIds } }, { 'items.productId': { $in: prodIds } },
  ...(bills.length ? [{ returnNumber: { $in: bills } }] : []),
] })
const purchases = await Purchase.find({ ownerId, $or: [
  { supplierId: { $in: suppIds } }, { 'items.productId': { $in: prodIds } },
  ...(poNumbers.length ? [{ poNumber: { $in: poNumbers } }] : []),
] })
const ledger = await UdhaarLedger.find({ ownerId, $or: [{ customerId: { $in: custIds } }, { saleId: { $in: saleIds } }] })
const variants = await ProductVariant.find({ ownerId, productId: { $in: prodIds } })
const batches = await ProductBatch.find({ ownerId, productId: { $in: prodIds } })

// ── 2. Reversals on records we KEEP ──────────────────────────
const stockDelta = new Map()      // productId -> +/- qty (kept products only)
const custDelta = new Map()       // customerId -> {outstanding,totalPurchase,visits,points}
const suppDelta = new Map()       // supplierId -> {outstanding,totalPurchased}
const add = (m, k, f, v) => { const o = m.get(k) || {}; o[f] = (o[f] || 0) + v; m.set(k, o) }
const warnings = []

for (const s of sales) {
  const live = s.status !== 'void'            // a voided sale already put its stock back
  for (const it of s.items) if (live && it.productId && !prodSet.has(sid(it.productId))) add(stockDelta, sid(it.productId), 'q', +it.quantity)
  if (live && s.customerId && !custSet.has(sid(s.customerId))) {
    add(custDelta, sid(s.customerId), 'totalPurchase', -(s.totalAmount || 0))
    add(custDelta, sid(s.customerId), 'visits', -1)
    add(custDelta, sid(s.customerId), 'points', (s.pointsRedeemed || 0) - (s.pointsEarned || 0))
  }
}
for (const r of returns) {
  const sale = sales.find(s => sid(s._id) === sid(r.saleId))
  if (!sale) warnings.push(`Return ${r.returnNumber} belongs to a sale that is not being removed`)
  for (const it of r.items) if (it.productId && !prodSet.has(sid(it.productId))) add(stockDelta, sid(it.productId), 'q', -it.quantity)
  if (r.refundMode === 'credit' && sale?.customerId && !custSet.has(sid(sale.customerId)))
    warnings.push(`Return ${r.returnNumber} was refunded to udhaar: check ${sale.customerId} balance after cleanup`)
}
for (const l of ledger) {
  if (custSet.has(sid(l.customerId))) continue
  if (l.type === 'credit') add(custDelta, sid(l.customerId), 'outstanding', -l.amount)
  else if (l.type === 'payment') add(custDelta, sid(l.customerId), 'outstanding', +l.amount)
  else warnings.push(`Ledger adjustment entry ${l._id} on kept customer ${l.customerId}: balance not auto-corrected`)
}
for (const p of purchases) {
  if (p.status !== 'received') continue       // only a received PO added stock / supplier balance
  for (const it of p.items) if (it.productId && !prodSet.has(sid(it.productId))) add(stockDelta, sid(it.productId), 'q', -it.quantity)
  if (p.supplierId && !suppIds.map(sid).includes(sid(p.supplierId))) {
    add(suppDelta, sid(p.supplierId), 'outstanding', -(p.dueAmount || 0))
    add(suppDelta, sid(p.supplierId), 'totalPurchased', -(p.totalAmount || 0))
  }
}
const keptStaffSales = await Sale.countDocuments({ ownerId, staffId: { $in: ids(staffUsers) }, _id: { $nin: saleIds } })
if (keptStaffSales) warnings.push(`${keptStaffSales} sale(s) that stay were billed by staff being removed (their name will show blank). Consider deactivating instead.`)

// ── 3. Report ────────────────────────────────────────────────
log(`\nShop: ${owner.email}   Match: ${prefixes.join(' | ')}   Mode: ${APPLY ? 'APPLY (deleting)' : 'DRY RUN (nothing changes)'}\n`)
const row = (t, a, f) => { log(`${t.padEnd(16)} ${String(a.length).padStart(3)}  ${a.slice(0, 8).map(f).join(', ')}${a.length > 8 ? ', …' : ''}`) }
row('customers', customers, d => d.name)
row('suppliers', suppliers, d => d.name)
row('products', products, d => d.name)
row('variants/batches', [...variants, ...batches], d => String(d._id).slice(-6))
row('expenses', expenses, d => `${d.description} ₹${d.amount}`)
row('staff logins', staffUsers, d => d.email)
row('sales', sales, d => d.billNumber)
row('sale returns', returns, d => d.returnNumber)
row('purchases', purchases, d => d.poNumber)
row('udhaar ledger', ledger, d => `${d.type} ₹${d.amount}`)
log('\nPut back on records that stay:')
for (const [k, v] of stockDelta) log(`  product ${k}: stock ${v.q > 0 ? '+' : ''}${v.q}`)
for (const [k, v] of custDelta) log(`  customer ${k}:`, JSON.stringify(v))
for (const [k, v] of suppDelta) log(`  supplier ${k}:`, JSON.stringify(v))
if (!stockDelta.size && !custDelta.size && !suppDelta.size) log('  (nothing)')
if (warnings.length) { log('\nWarnings:'); warnings.forEach(w => log('  ! ' + w)) }

if (!APPLY) { log('\nDry run only. Re-run with --apply after checking the list above.'); await mongoose.disconnect(); process.exit(0) }

// ── 4. Apply ─────────────────────────────────────────────────
for (const [k, v] of stockDelta) await Product.updateOne({ _id: k, ownerId }, { $inc: { stock: v.q } })
for (const [k, v] of custDelta) await Customer.updateOne({ _id: k, ownerId }, { $inc: {
  outstandingBalance: v.outstanding || 0, totalPurchase: v.totalPurchase || 0, visitCount: v.visits || 0, loyaltyPoints: v.points || 0 } })
for (const [k, v] of suppDelta) await Supplier.updateOne({ _id: k, ownerId }, { $inc: { outstandingBalance: v.outstanding || 0, totalPurchased: v.totalPurchased || 0 } })

const del = async (M, filter, label) => { const r = await M.deleteMany({ ownerId, ...filter }); log(`deleted ${String(r.deletedCount).padStart(3)} ${label}`) }
await del(UdhaarLedger, { _id: { $in: ids(ledger) } }, 'ledger entries')
await del(SaleReturn, { _id: { $in: ids(returns) } }, 'sale returns')
await del(Sale, { _id: { $in: saleIds } }, 'sales')
await del(Purchase, { _id: { $in: ids(purchases) } }, 'purchases')
await del(ProductBatch, { _id: { $in: ids(batches) } }, 'batches')
await del(ProductVariant, { _id: { $in: ids(variants) } }, 'variants')
await del(Product, { _id: { $in: prodIds } }, 'products')
await del(Customer, { _id: { $in: custIds } }, 'customers')
await del(Supplier, { _id: { $in: suppIds } }, 'suppliers')
await del(Expense, { _id: { $in: ids(expenses) } }, 'expenses')
await del(Staff, { _id: { $in: ids(staffDocs) } }, 'staff profiles')
const rU = await User.deleteMany({ _id: { $in: ids(staffUsers) }, shopOwnerId: ownerId }); log(`deleted ${String(rU.deletedCount).padStart(3)} staff logins`)
// Audit entries describing the removed records (soft-delete snapshots of test data) go too.
const gone = [...custIds, ...suppIds, ...prodIds, ...saleIds, ...ids(staffUsers), ...ids(staffDocs), ...ids(expenses), ...ids(purchases)]
await del(AuditLog, { documentId: { $in: gone } }, 'audit log entries')
log('\nDone. Open the app and spot-check stock and balances.')
await mongoose.disconnect()
