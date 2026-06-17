export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
    .format(amount || 0)

export const roundOff = (amount) => Math.round(amount * 100) / 100
