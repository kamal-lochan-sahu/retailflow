// Runs on every request, before any controller.
//  1. NoSQL-injection guard: drops keys starting with "$" or containing "." anywhere in
//     body / query / params (e.g. {"email": {"$ne": null}}).
//  2. Mass-assignment guard: on writes, drops fields a client must never set directly
//     (tenant id, soft-delete markers, timestamps, session fields). Controllers that
//     update with `req.body` can then no longer move a record to another shop or
//     resurrect a deleted one.
const PROTECTED = [
  '_id', '__v', 'ownerId', 'shopOwnerId', 'createdAt', 'updatedAt',
  'isDeleted', 'deletedAt', 'deletedBy',
  'refreshTokens', 'resetToken', 'resetExpires',
]

const scrub = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object' || depth > 10) return
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) { delete obj[key]; continue }
    scrub(obj[key], depth + 1)
  }
}

export const sanitizeRequest = (req, _res, next) => {
  scrub(req.body); scrub(req.query); scrub(req.params)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && !Array.isArray(req.body) && typeof req.body === 'object') {
    for (const key of PROTECTED) delete req.body[key]
  }
  next()
}
