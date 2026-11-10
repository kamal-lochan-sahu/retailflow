// One place that decides what a purchase is worth, used by create AND update, so the client can
// never dictate totals. purchasePrice is the final per-unit price the shop pays (the Add Purchase
// screen has always summed qty x price with no GST added on top), so total = subtotal.
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export const computePurchaseTotals = (items = []) => {
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.purchasePrice) || 0), 0))
  return { subtotal, gstAmount: 0, totalAmount: subtotal }
}
