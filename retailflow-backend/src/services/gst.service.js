export const calculateGST = (amount, gstPercent, isInclusive = false) => {
  if (!gstPercent) return { base: amount, gst: 0, total: amount }
  if (isInclusive) {
    const base = (amount * 100) / (100 + gstPercent)
    const gst  = amount - base
    return { base: Math.round(base*100)/100, gst: Math.round(gst*100)/100, total: amount }
  }
  const gst   = (amount * gstPercent) / 100
  return { base: amount, gst: Math.round(gst*100)/100, total: amount + gst }
}

export const splitGST = (gstAmount, isInterState = false) => {
  if (isInterState) return { cgst: 0, sgst: 0, igst: gstAmount }
  const half = Math.round((gstAmount / 2) * 100) / 100
  return { cgst: half, sgst: gstAmount - half, igst: 0 }
}
