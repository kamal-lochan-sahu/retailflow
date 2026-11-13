// Per-client POS rules (Settings.pos), enforced on the server so a tampered client can't skip them.
//   cashierCanChangePrice      - may a cashier bill an item at a price other than the product's own? (default no)
//   cashierMaxDiscountPercent  - biggest discount a cashier may give, per item and on the whole bill (default 10)
// Owner and manager are never restricted.

const EXEMPT = new Set(['owner', 'manager'])
const EPS = 0.005

export const getPosRules = (settings) => {
  const max = Number(settings?.pos?.cashierMaxDiscountPercent)
  return {
    cashierCanChangePrice:     settings?.pos?.cashierCanChangePrice === true,
    cashierMaxDiscountPercent: Number.isFinite(max) ? Math.min(100, Math.max(0, max)) : 10,
  }
}

const itemDiscountPercent = (l) => {
  const gross = l.sellingPrice * l.quantity
  if (!(gross > 0) || !(l.discount > 0)) return 0
  return l.discountType === 'percent' ? l.discount : (l.discount / gross) * 100
}

/**
 * lines: [{ name, refPrice, sellingPrice, quantity, discount, discountType }]  (sellingPrice = price actually used)
 * bill:  { discountAmount, discountType, subtotal }  (subtotal = after item discounts)
 * Returns a list of human-readable problems; empty = fine.
 */
export const posRuleViolations = ({ role, settings, lines, bill }) => {
  if (EXEMPT.has(role)) return []
  const rules = getPosRules(settings)
  const out = []
  for (const l of lines) {
    if (!rules.cashierCanChangePrice && Math.abs(l.sellingPrice - l.refPrice) > EPS)
      out.push(`"${l.name}": price changes are not allowed for your role (price is ${l.refPrice}, got ${l.sellingPrice})`)
    if (itemDiscountPercent(l) > rules.cashierMaxDiscountPercent + EPS)
      out.push(`"${l.name}": discount above ${rules.cashierMaxDiscountPercent}% needs a manager or owner`)
  }
  const billPct = bill.discountType === 'percent'
    ? bill.discountAmount
    : (bill.subtotal > 0 ? (bill.discountAmount / bill.subtotal) * 100 : (bill.discountAmount > 0 ? Infinity : 0))
  if (billPct > rules.cashierMaxDiscountPercent + EPS)
    out.push(`Bill discount above ${rules.cashierMaxDiscountPercent}% needs a manager or owner`)
  return out
}

// Applies to everyone: a discount can't make a line or the bill negative.
export const discountOverflow = ({ lines, bill }) => {
  for (const l of lines) {
    const gross = l.sellingPrice * l.quantity
    const d = l.discountType === 'percent' ? gross * l.discount / 100 : l.discount
    if (d > gross + EPS) return `Discount on "${l.name}" is more than the item's price`
  }
  const d = bill.discountType === 'percent' ? bill.subtotal * bill.discountAmount / 100 : bill.discountAmount
  if (d > bill.subtotal + EPS) return 'Bill discount is more than the bill amount'
  return null
}
