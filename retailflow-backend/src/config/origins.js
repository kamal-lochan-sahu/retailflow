// Browser origins allowed to call the API (and open a socket).
// CLIENT_URL may hold several comma-separated origins (e.g. the Vercel domain + a custom domain).
export const getAllowedOrigins = () => {
  const list = String(process.env.CLIENT_URL || '')
    .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
  if (process.env.NODE_ENV !== 'production') list.push('http://localhost:3000', 'http://localhost:5173')
  return [...new Set(list)]
}
