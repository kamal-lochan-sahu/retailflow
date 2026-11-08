import User from '../models/User.js'

// Public sign-up creates a brand-new owner + shop, which a white-label deployment (one shop per
// instance) never wants to expose. Rules:
//   ALLOW_REGISTRATION=true   -> always open
//   ALLOW_REGISTRATION=false  -> open only while the database has no users (first-owner bootstrap)
//   unset                     -> open outside production (local dev), bootstrap-only in production
export const registrationOpen = async () => {
  const flag = String(process.env.ALLOW_REGISTRATION ?? '').toLowerCase()
  if (flag === 'true') return true
  if (flag !== 'false' && process.env.NODE_ENV !== 'production') return true
  return (await User.estimatedDocumentCount()) === 0
}
