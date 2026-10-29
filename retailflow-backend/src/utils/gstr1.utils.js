// Pure GSTR-1 builder: bills in, GST Offline Tool JSON + a plain-language issues list out.
// No DB access here on purpose — everything is passed in, so it can be unit-tested with
// hand-made data and the numbers checked by eye.
//
// What it produces (JSON layout of the GST Offline Tool, "GST3.2.x" family):
//   b2b      Table 4  — invoices to GSTIN-holding customers, grouped by customer GSTIN
//   b2cs     Table 7  — everything else, consolidated by place of supply + rate
//   cdnr     Table 9B — credit notes (sale returns) against GSTIN-holding customers
//   nil      Table 8  — 0% lines (reported as nil-rated; see issues)
//   hsn      Table 12 — HSN summary, split B2B / B2C
//   doc_issue Table 13 — invoice / credit-note number ranges
//
// Deliberate simplifications (all surfaced to the user as issues, never silent):
//   * Customers have no state field, so an unregistered (B2C) sale is treated as intra-state
//     (place of supply = the shop's own state). That means no B2CL (inter-state > ₹1 lakh) table.
//   * Tax is split CGST/SGST 50:50 for intra-state, IGST for a B2B customer in another state.
//   * Tax amounts are what was actually charged on each bill line.

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
// GSTN's own rule for invoice / note numbers: max 16 chars, letters/digits/-//, not starting with 0 - /
export const INUM_RE = /^[A-Za-z1-9][A-Za-z0-9/-]{0,15}$/

const UQC = { piece: 'PCS', kg: 'KGS', gram: 'GMS', litre: 'LTR', ml: 'MLT', dozen: 'DOZ', box: 'BOX', packet: 'PAC' }

const IST_MS = 19800000 // India has no DST: always UTC+5:30
const pad = (n) => String(n).padStart(2, '0')
const r2  = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const r3  = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000

const istParts = (d) => new Date(new Date(d).getTime() + IST_MS)
export const fmtDate = (d) => { const t = istParts(d); return `${pad(t.getUTCDate())}-${pad(t.getUTCMonth() + 1)}-${t.getUTCFullYear()}` }

// [start, end) of a calendar month in IST, as UTC instants.
export const periodRange = (month, year) => ({
  start: new Date(Date.UTC(year, month - 1, 1) - IST_MS),
  end:   new Date(Date.UTC(year, month, 1) - IST_MS),
})

const taxSplit = (tax, inter) =>
  inter
    ? { iamt: r2(tax), camt: 0, samt: 0 }
    : { iamt: 0, camt: r2(tax / 2), samt: r2(tax - r2(tax / 2)) }

const only = (o) => { // drop the tax heads that don't apply, keep the JSON tidy
  const out = { ...o }
  for (const k of ['iamt', 'camt', 'samt']) if (!out[k]) delete out[k]
  return out
}

export function buildGstr1({ shopGstin, month, year, sales = [], returns = [], origSalesById = {}, productById = {} }) {
  const shopState = shopGstin.slice(0, 2)
  const issueMap = new Map()
  const note = (key, severity, message, example) => {
    const cur = issueMap.get(key) || { key, severity, message, count: 0, examples: [] }
    cur.count++
    if (example && cur.examples.length < 3 && !cur.examples.includes(example)) cur.examples.push(example)
    issueMap.set(key, cur)
  }

  const customerOf = (s) => (s.customerId && typeof s.customerId === 'object' ? s.customerId : null)
  const classify = (s) => {
    const ctin = String(customerOf(s)?.gstin || '').trim().toUpperCase()
    const valid = GSTIN_RE.test(ctin)
    if (ctin && !valid) note('badGstin', 'warn', 'Customer GSTIN is not a valid GSTIN format, so those sales were treated as unregistered (B2C)', ctin)
    const pos = valid ? ctin.slice(0, 2) : shopState
    return { b2b: valid, ctin, pos, inter: pos !== shopState }
  }
  const prod = (id) => productById[String(id)] || null

  // ── accumulators ────────────────────────────────────────────
  const b2bByCtin = new Map()           // ctin -> invoice[]
  const b2cs      = new Map()           // sply|pos|rt -> row
  const nil       = new Map()           // sply_ty -> nil_amt
  const hsn       = new Map()           // b2b|b2c + hsn + uqc + rt -> row
  const cdnrByCtin = new Map()
  const seenInum  = new Set()
  const totals    = { invoices: 0, taxable: 0, tax: 0 }

  const addB2cs = (sply, pos, rt, txval, tax, inter) => {
    const key = `${sply}|${pos}|${rt}`
    const row = b2cs.get(key) || { sply_ty: sply, pos, typ: 'OE', rt, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 }
    const sp = taxSplit(tax, inter)
    row.txval += txval; row.iamt += sp.iamt; row.camt += sp.camt; row.samt += sp.samt
    b2cs.set(key, row)
  }

  // ── invoices ────────────────────────────────────────────────
  let voidCount = 0
  const live = []
  for (const s of sales) {
    if (s.status === 'void') { voidCount++; continue }
    live.push(s)
    const c = classify(s)
    totals.invoices++

    if (!INUM_RE.test(String(s.billNumber))) note('inum', 'error', 'Invoice numbers GSTN will reject (must be 1–16 characters: letters, digits, - or /, not starting with 0)', s.billNumber)
    if (seenInum.has(s.billNumber)) note('dupInum', 'error', 'Duplicate invoice numbers in this period', s.billNumber)
    seenInum.add(s.billNumber)
    if (s.discountAmount > 0) note('discount', 'warn', 'Some bills have a bill-level discount. Tax was charged on line values before that discount, and that is what is reported — check with your CA if discounts were meant to reduce taxable value')

    const byRate = new Map()
    for (const it of s.items || []) {
      const rt = Number(it.gstPercent) || 0
      const p = prod(it.productId)
      const g = byRate.get(rt) || { txval: 0, tax: 0 }
      g.txval += Number(it.total) || 0
      g.tax   += Number(it.gstAmount) || 0
      byRate.set(rt, g)
      totals.taxable += Number(it.total) || 0
      totals.tax     += Number(it.gstAmount) || 0

      // HSN summary row
      const code = String(p?.hsnCode || '').replace(/\s+/g, '')
      if (!code) { note('noHsn', 'error', 'Products with no HSN code — they are missing from the HSN summary (Table 12). Add HSN in Edit Product', it.name); continue }
      if (code.length < 4) note('shortHsn', 'warn', 'HSN codes shorter than 4 digits (4 digits minimum, 6 if turnover is above ₹5 crore)', `${it.name} (${code})`)
      const unit = it.unit || p?.unit
      const uqc = UQC[unit] || 'OTH'
      if (uqc === 'OTH') note('uqc', 'warn', 'Units with no GST UQC equivalent were reported as OTH', String(unit))
      const hk = `${c.b2b ? 'b2b' : 'b2c'}|${code}|${uqc}|${rt}`
      const row = hsn.get(hk) || { side: c.b2b ? 'b2b' : 'b2c', hsn_sc: code, desc: String(it.name || '').slice(0, 30), uqc, qty: 0, rt, val: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 }
      const tax = Number(it.gstAmount) || 0
      const sp = taxSplit(tax, c.inter)
      row.qty += Number(it.quantity) || 0
      row.txval += Number(it.total) || 0
      row.val += (Number(it.total) || 0) + tax
      row.iamt += sp.iamt; row.camt += sp.camt; row.samt += sp.samt
      hsn.set(hk, row)
    }

    const itms = []
    for (const [rt, g] of [...byRate.entries()].sort((a, b) => a[0] - b[0])) {
      if (rt === 0) {
        const key = `${c.inter ? 'INTR' : 'INTRA'}${c.b2b ? 'B2B' : 'B2C'}`
        nil.set(key, (nil.get(key) || 0) + g.txval)
        note('zeroRate', 'info', '0% lines are reported as nil-rated (Table 8). If some are exempt or non-GST supplies, split them on the portal')
        continue
      }
      if (c.b2b) {
        itms.push({ num: itms.length + 1, itm_det: only({ rt, txval: r2(g.txval), ...taxSplit(g.tax, c.inter), csamt: 0 }) })
      } else {
        addB2cs(c.inter ? 'INTER' : 'INTRA', c.pos, rt, g.txval, g.tax, c.inter)
      }
    }

    if (c.b2b && itms.length) {
      const list = b2bByCtin.get(c.ctin) || []
      list.push({ inum: s.billNumber, idt: fmtDate(s.createdAt), val: r2(s.totalAmount), pos: c.pos, rchrg: 'N', inv_typ: 'R', itms })
      b2bByCtin.set(c.ctin, list)
    }
  }

  // ── credit notes (sale returns) ─────────────────────────────
  let cnCount = 0
  for (const ret of returns) {
    const orig = origSalesById[String(ret.saleId?._id || ret.saleId)]
    if (!orig) { note('retNoSale', 'warn', 'Some returns point to a sale that could not be found and were left out', ret.returnNumber); continue }
    cnCount++
    const c = classify(orig)
    if (ret.returnNumber && !INUM_RE.test(ret.returnNumber)) note('cnum', 'error', 'Credit note numbers GSTN will reject (1–16 chars: letters, digits, - or /)', ret.returnNumber)

    const byRate = new Map()
    for (const it of ret.items || []) {
      const line = (orig.items || []).find(x => String(x.productId) === String(it.productId))
      const rt = Number(line?.gstPercent ?? prod(it.productId)?.gstPercent) || 0
      const amount = Number(it.amount) || 0            // refund amount, taken as tax-inclusive
      const txval = rt ? amount / (1 + rt / 100) : amount
      const g = byRate.get(rt) || { txval: 0, tax: 0 }
      g.txval += txval; g.tax += amount - txval
      byRate.set(rt, g)
    }
    const itms = []
    for (const [rt, g] of [...byRate.entries()].sort((a, b) => a[0] - b[0])) {
      if (rt === 0) { note('retZero', 'warn', 'Returns of 0% items are not reported (the nil-rated table cannot go negative) — adjust on the portal if needed'); continue }
      if (c.b2b) itms.push({ num: itms.length + 1, itm_det: only({ rt, txval: r2(g.txval), ...taxSplit(g.tax, c.inter), csamt: 0 }) })
      else {
        addB2cs(c.inter ? 'INTER' : 'INTRA', c.pos, rt, -g.txval, -g.tax, c.inter)
        note('b2cNet', 'info', 'Returns from unregistered customers are netted against B2CS (Table 7), not listed as credit notes')
      }
    }
    if (c.b2b && itms.length) {
      const list = cdnrByCtin.get(c.ctin) || []
      list.push({ ntty: 'C', nt_num: ret.returnNumber, nt_dt: fmtDate(ret.createdAt), val: r2(ret.totalAmount), pos: c.pos, rchrg: 'N', inv_typ: 'R', itms })
      cdnrByCtin.set(c.ctin, list)
    }
  }
  if (cnCount) note('hsnReturns', 'info', 'The HSN summary is built from invoices only and does not net off returns — adjust on the portal if you had returns this month')

  // ── assemble ────────────────────────────────────────────────
  const json = { gstin: shopGstin, fp: `${pad(month)}${year}`, version: 'GST3.2.4', hash: 'hash', gt: 0, cur_gt: 0 }

  if (b2bByCtin.size) json.b2b = [...b2bByCtin.entries()].map(([ctin, inv]) => ({ ctin, inv }))

  if (b2cs.size) {
    json.b2cs = [...b2cs.values()].map(r => only({ ...r, txval: r2(r.txval), iamt: r2(r.iamt), camt: r2(r.camt), samt: r2(r.samt) }))
      .sort((a, b) => a.rt - b.rt)
  }

  if (cdnrByCtin.size) json.cdnr = [...cdnrByCtin.entries()].map(([ctin, nt]) => ({ ctin, nt }))

  if (nil.size) {
    json.nil = { inv: [...nil.entries()].map(([sply_ty, amt]) => ({ sply_ty, expt_amt: 0, nil_amt: r2(amt), ngsup_amt: 0 })) }
  }

  const hsnRows = (side) => [...hsn.values()].filter(r => r.side === side)
    .sort((a, b) => a.hsn_sc.localeCompare(b.hsn_sc) || a.rt - b.rt)
    .map((r, i) => only({ num: i + 1, hsn_sc: r.hsn_sc, desc: r.desc, uqc: r.uqc, qty: r3(r.qty), rt: r.rt, val: r2(r.val), txval: r2(r.txval), iamt: r2(r.iamt), camt: r2(r.camt), samt: r2(r.samt), csamt: 0 }))
  const hb2b = hsnRows('b2b'), hb2c = hsnRows('b2c')
  if (hb2b.length || hb2c.length) {
    json.hsn = {}
    if (hb2b.length) json.hsn.hsn_b2b = hb2b
    if (hb2c.length) json.hsn.hsn_b2c = hb2c
  }

  const docDet = []
  if (sales.length) {
    const ordered = [...sales].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || String(a.billNumber).localeCompare(String(b.billNumber)))
    docDet.push({ doc_num: 1, docs: [{ num: 1, from: ordered[0].billNumber, to: ordered[ordered.length - 1].billNumber, totnum: sales.length, cancel: voidCount, net_issue: sales.length - voidCount }] })
  }
  if (returns.length) {
    const ordered = [...returns].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    docDet.push({ doc_num: 5, docs: [{ num: 1, from: ordered[0].returnNumber, to: ordered[ordered.length - 1].returnNumber, totnum: returns.length, cancel: 0, net_issue: returns.length }] })
  }
  if (docDet.length) json.doc_issue = { doc_det: docDet }

  if (!sales.length && !returns.length) note('empty', 'info', 'No sales found in this period')
  note('b2cl', 'info', 'B2C-large (inter-state, above ₹1 lakh) is not generated: customers have no state recorded, so all unregistered sales are treated as intra-state')
  note('gt', 'info', 'Gross turnover fields (gt / cur_gt) are left as 0 — enter your aggregate turnover on the portal / offline tool')

  const order = { error: 0, warn: 1, info: 2 }
  const issues = [...issueMap.values()].sort((a, b) => order[a.severity] - order[b.severity])
    .map(i => ({ severity: i.severity, message: i.message, count: i.count, examples: i.examples }))

  const b2bInvoices = [...b2bByCtin.values()].reduce((n, l) => n + l.length, 0)
  const summary = {
    period: json.fp,
    invoices: totals.invoices, cancelled: voidCount,
    b2bInvoices, b2bCustomers: b2bByCtin.size,
    b2csRows: b2cs.size,
    creditNotes: [...cdnrByCtin.values()].reduce((n, l) => n + l.length, 0),
    hsnRows: hb2b.length + hb2c.length,
    taxable: r2(totals.taxable), tax: r2(totals.tax),
    nilRated: r2([...nil.values()].reduce((a, b) => a + b, 0)),
  }
  return { json, summary, issues }
}
