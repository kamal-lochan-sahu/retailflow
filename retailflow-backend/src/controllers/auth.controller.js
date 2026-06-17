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

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
}

export const register = asyncHandler(async (req, res) => {
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
  const refreshToken = generateRefreshToken({ _id: user._id })
  user.refreshToken  = refreshToken
  await user.save({ validateBeforeSave: false })

  const userData = await User.findById(user._id).select('-password -refreshToken')

  res.status(201)
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 3600 * 1000 })
    .json(new ApiResponse(201, { user: userData, accessToken }, 'Registered successfully'))
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+password +refreshToken')
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid credentials')
  if (!await user.isPasswordCorrect(password)) throw new ApiError(401, 'Invalid credentials')

  const accessToken  = generateAccessToken({ _id: user._id })
  const refreshToken = generateRefreshToken({ _id: user._id })
  user.refreshToken = refreshToken
  user.lastLogin    = new Date()
  await user.save({ validateBeforeSave: false })

  const userData = await User.findById(user._id).select('-password -refreshToken')

  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 3600 * 1000 })
    .json(new ApiResponse(200, { user: userData, accessToken }, 'Login successful'))
})

export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } })
  await delCache(`user:${req.user._id}`)
  res.clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'Logged out'))
})

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken
  if (!token) throw new ApiError(401, 'Refresh token required')

  const decoded = verifyRefreshToken(token)
  const user = await User.findById(decoded._id).select('+refreshToken')
  if (!user || user.refreshToken !== token) throw new ApiError(401, 'Invalid refresh token')

  const newAccessToken  = generateAccessToken({ _id: user._id })
  const newRefreshToken = generateRefreshToken({ _id: user._id })
  user.refreshToken = newRefreshToken
  await user.save({ validateBeforeSave: false })

  res.cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 3600 * 1000 })
    .json(new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed'))
})

export const getMe = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne({ ownerId: req.user.role === 'owner' ? req.user._id : req.user._id })
  res.json(new ApiResponse(200, { user: req.user, settings }))
})

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
  if (!user) return res.json(new ApiResponse(200, {}, 'If email exists, reset link sent'))

  const token   = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + 3600000
  // Store token in user (simple approach)
  user.resetToken   = crypto.createHash('sha256').update(token).digest('hex')
  user.resetExpires = expires
  await user.save({ validateBeforeSave: false })

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`
  await sendPasswordResetEmail(user.email, user.name, resetUrl, process.env.SHOP_NAME)
  res.json(new ApiResponse(200, {}, 'Password reset email sent'))
})

export const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex')
  const user = await User.findOne({
    resetToken: hashed,
    resetExpires: { $gt: Date.now() }
  })
  if (!user) throw new ApiError(400, 'Invalid or expired reset token')

  user.password    = req.body.password
  user.resetToken  = undefined
  user.resetExpires = undefined
  await user.save()

  res.json(new ApiResponse(200, {}, 'Password reset successful'))
})

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password')
  if (!await user.isPasswordCorrect(req.body.currentPassword))
    throw new ApiError(400, 'Current password is incorrect')
  user.password = req.body.newPassword
  await user.save()
  res.json(new ApiResponse(200, {}, 'Password changed successfully'))
})
