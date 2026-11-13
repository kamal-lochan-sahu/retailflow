import crypto from 'crypto'
import User from '../models/User.js'
import Settings from '../models/Settings.js'
import Branch from '../models/Branch.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils.js'
import { sendPasswordResetEmail } from '../utils/email.utils.js'
import { delCache } from '../config/redis.js'
import { isEmailConfigured } from '../config/email.js'
import { registrationOpen } from '../utils/registration.utils.js'

// ── Sessions ─────────────────────────────────────────────────
// The frontend (Vercel) and API (Render) are on different domains, so a cookie can
// neither be sent reliably nor read without cookie-parser (which this app never had —
// that is why silent refresh used to fail and everyone was logged out every 15 minutes).
// The refresh token is therefore returned in the JSON body and sent back in the body.
//
// Up to MAX_SESSIONS refresh tokens (stored only as SHA-256 hashes) can be valid at once,
// so the owner can be logged in on a phone and a laptop together. Logging out revokes only
// that device's token. A token close to expiry is swapped for a fresh one on refresh; the
// old one stays valid until it expires, so two tabs refreshing at once cannot lock each
// other out.
const MAX_SESSIONS = 8
const ROTATE_WHEN_LEFT_SEC = 2 * 24 * 3600

const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('hex')

// jti makes every refresh token unique, even two issued in the same second (JWTs have 1s resolution).
const newRefreshToken = (userId) => generateRefreshToken({ _id: userId, jti: crypto.randomUUID() })

const addSession = (userId, refreshToken) =>
  User.updateOne({ _id: userId }, { $push: { refreshTokens: { $each: [sha(refreshToken)], $slice: -MAX_SESSIONS } } })

export const registrationStatus = asyncHandler(async (_req, res) => {
  res.json(new ApiResponse(200, { open: await registrationOpen() }))
})

export const register = asyncHandler(async (req, res) => {
  if (!await registrationOpen())
    throw new ApiError(403, 'Registration is closed. Ask the shop owner to create your account.')
  const { name, email, phone, password, shopName } = req.body
  const existing = await User.findOne({ email })
  if (existing) throw new ApiError(409, 'Email already registered')

  const user = await User.create({
    name, email, phone, password,
    role: 'owner',
    branding: {
      shopName: shopName || process.env.SHOP_NAME || name + "'s Shop",
      primaryColor: process.env.BRAND_COLOR || '#2563eb',
    },
    isActive: true,
  })

  // Default settings
  await Settings.create({ ownerId: user._id })

  // Default branch
  await Branch.create({
    ownerId: user._id,
    name: shopName || 'Main Branch',
    isDefault: true,
  })

  const accessToken  = generateAccessToken({ _id: user._id })
  const refreshToken = newRefreshToken(user._id)
  await addSession(user._id, refreshToken)

  const userData = await User.findById(user._id).select('-password -refreshToken -refreshTokens')

  res.status(201)
    .json(new ApiResponse(201, { user: userData, accessToken, refreshToken }, 'Registered successfully'))
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+password')
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid credentials')
  if (!await user.isPasswordCorrect(password)) throw new ApiError(401, 'Invalid credentials')

  const accessToken  = generateAccessToken({ _id: user._id })
  const refreshToken = newRefreshToken(user._id)
  await addSession(user._id, refreshToken)
  await User.updateOne({ _id: user._id }, { lastLogin: new Date() })

  const userData = await User.findById(user._id).select('-password -refreshToken -refreshTokens')

  res.json(new ApiResponse(200, { user: userData, accessToken, refreshToken }, 'Login successful'))
})

// Not behind authenticate: the access token has usually expired by the time someone
// logs out, and the refresh token is the thing being revoked.
export const logout = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken
  if (typeof token === 'string' && token) {
    try {
      const decoded = verifyRefreshToken(token)
      await User.updateOne({ _id: decoded._id }, { $pull: { refreshTokens: sha(token) } })
      await delCache(`user:${decoded._id}`)
    } catch { /* expired / malformed — nothing to revoke */ }
  }
  res.json(new ApiResponse(200, {}, 'Logged out'))
})

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken
  if (typeof token !== 'string' || !token) throw new ApiError(401, 'Refresh token required')

  let decoded
  try { decoded = verifyRefreshToken(token) } catch { throw new ApiError(401, 'Invalid or expired refresh token') }

  const user = await User.findOne({ _id: decoded._id, refreshTokens: sha(token) }).select('isActive')
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid or expired refresh token')

  const accessToken = generateAccessToken({ _id: user._id })
  const payload = { accessToken }

  const secondsLeft = (decoded.exp || 0) - Math.floor(Date.now() / 1000)
  if (secondsLeft < ROTATE_WHEN_LEFT_SEC) {
    payload.refreshToken = newRefreshToken(user._id)
    await addSession(user._id, payload.refreshToken)
  }

  res.json(new ApiResponse(200, payload, 'Token refreshed'))
})

export const getMe = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne({ ownerId: req.scopeOwnerId })
  res.json(new ApiResponse(200, { user: req.user, settings }))
})

const FORGOT_REPLY = 'If that email is registered, a reset link has been sent'

export const forgotPassword = asyncHandler(async (req, res) => {
  // Every outcome (unknown email, deactivated account, mail server down) gets the SAME reply, so this
  // endpoint can't be used to find out which emails have accounts.
  const reply = () => res.json(new ApiResponse(200, {}, FORGOT_REPLY))
  const user = await User.findOne({ email: String(req.body.email).toLowerCase().trim(), isActive: true })
  if (!user) return reply()

  const token   = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + 3600000
  // Store token in user (simple approach)
  user.resetToken   = crypto.createHash('sha256').update(token).digest('hex')
  user.resetExpires = expires
  await user.save({ validateBeforeSave: false })

  const resetUrl = `${String(process.env.CLIENT_URL || '').split(',')[0].trim()}/reset-password/${token}`
  try {
    if (!isEmailConfigured()) throw new Error('email not configured (set EMAIL_PROVIDER)')
    await sendPasswordResetEmail(user.email, user.name, resetUrl, process.env.SHOP_NAME)
  } catch (err) {
    console.error('Password reset email failed:', err.message)   // never log the reset URL / token
  }
  reply()
})

export const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(String(req.params.token)).digest('hex')
  const user = await User.findOne({
    resetToken: hashed,
    resetExpires: { $gt: Date.now() }
  })
  if (!user) throw new ApiError(400, 'Invalid or expired reset token')

  user.password    = req.body.password
  user.resetToken  = undefined
  user.resetExpires = undefined
  user.refreshTokens = []            // a reset means the old password may have leaked: sign out everywhere
  await user.save()

  res.json(new ApiResponse(200, {}, 'Password reset successful'))
})

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password')
  if (!await user.isPasswordCorrect(req.body.currentPassword))
    throw new ApiError(400, 'Current password is incorrect')
  if (req.body.currentPassword === req.body.newPassword)
    throw new ApiError(400, 'New password must be different from the current one')

  // Sign out every other device (a changed password usually means the old one may be known to
  // someone else) but keep the session making this request, if the client told us which it is.
  const current = typeof req.body.refreshToken === 'string' ? sha(req.body.refreshToken) : null
  const stored  = await User.findById(user._id).select('refreshTokens')
  user.refreshTokens = current && stored.refreshTokens.includes(current) ? [current] : []
  user.password = req.body.newPassword
  await user.save()
  await delCache(`user:${user._id}`)
  res.json(new ApiResponse(200, { otherSessionsSignedOut: true }, 'Password changed successfully'))
})
