export const formatINR = (amount = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)

export const formatNumber = (n = 0) =>
  new Intl.NumberFormat('en-IN').format(n)

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })

export const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
