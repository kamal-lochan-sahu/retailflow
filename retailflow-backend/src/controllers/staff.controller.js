import Staff from '../models/Staff.js'
import User from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const STAFF_ROLES = ['manager', 'cashier', 'stockboy', 'delivery']
const userFields  = 'name email phone role isActive lastLogin'

export const getAll = asyncHandler(async (req, res) => {
  const filter = { ownerId: req.scopeOwnerId }
  const items  = await Staff.find(filter).sort({ createdAt: -1 }).populate('userId', userFields).lean()
  res.json(new ApiResponse(200, items))
})

export const getOne = asyncHandler(async (req, res) => {
  const item = await Staff.findOne({ _id: req.params.id, ownerId: req.scopeOwnerId }).populate('userId', userFields)
  if (!item) throw new ApiError(404, 'Staff not found')
  res.json(new ApiResponse(200, item))
})

// Creates the login (User, role != owner) and the HR record (Staff) together.
// Staff didn't have accounts before this — there was no other endpoint that
// could create a non-owner User under an existing shop.
export const create = asyncHandler(async (req, res) => {
  const {
    name, email, phone, password, role,
    designation, salary, commission, joiningDate, emergencyContact
  } = req.body

  if (!name || !email || !password) throw new ApiError(400, 'name, email and password are required')
  if (!STAFF_ROLES.includes(role)) throw new ApiError(400, `role must be one of: ${STAFF_ROLES.join(', ')}`)

  const existing = await User.findOne({ email })
  if (existing) throw new ApiError(409, 'Email already registered')

  const user = await User.create({
    name, email, phone, password, role,
    shopOwnerId: req.scopeOwnerId,
    isActive: true,
  })

  const staff = await Staff.create({
    ownerId: req.scopeOwnerId,
    userId:  user._id,
    designation, salary, commission, emergencyContact,
    joiningDate: joiningDate || Date.now(),
  })

  const staffWithUser = await Staff.findById(staff._id).populate('userId', userFields)
  res.status(201).json(new ApiResponse(201, staffWithUser, 'Staff created'))
})

// Updates HR fields on Staff, and — if name/phone/isActive/role are present
// in the body — the linked User too, so "deactivate" (isActive: false) is a
// single call from the frontend rather than two.
export const update = asyncHandler(async (req, res) => {
  const {
    designation, salary, commission, emergencyContact, joiningDate, isActive,
    name, phone, role
  } = req.body

  const item = await Staff.findOne({ _id: req.params.id, ownerId: req.scopeOwnerId })
  if (!item) throw new ApiError(404, 'Staff not found')

  const staffUpdate = { designation, salary, commission, emergencyContact, joiningDate, isActive }
  Object.keys(staffUpdate).forEach(k => staffUpdate[k] === undefined && delete staffUpdate[k])
  if (Object.keys(staffUpdate).length) { Object.assign(item, staffUpdate); await item.save() }

  const userUpdate = { name, phone }
  if (role) {
    if (!STAFF_ROLES.includes(role)) throw new ApiError(400, `role must be one of: ${STAFF_ROLES.join(', ')}`)
    userUpdate.role = role
  }
  // Staff.isActive is the single switch the list UI already shows — keep
  // User.isActive in lockstep, since that's what authenticate() actually
  // checks to allow or block login.
  if (isActive !== undefined) userUpdate.isActive = isActive
  Object.keys(userUpdate).forEach(k => userUpdate[k] === undefined && delete userUpdate[k])
  if (Object.keys(userUpdate).length) {
    await User.findByIdAndUpdate(item.userId, userUpdate)
  }

  const staffWithUser = await Staff.findById(item._id).populate('userId', userFields)
  res.json(new ApiResponse(200, staffWithUser, 'Staff updated'))
})

// Removes the HR record and deactivates the login (not a hard User delete —
// historical Sale.staffId / Purchase.receivedBy attribution stays intact and
// still resolves via populate; deactivating is what actually blocks login,
// same check authenticate() already does for any inactive user).
export const remove = asyncHandler(async (req, res) => {
  const item = await Staff.findOneAndDelete({ _id: req.params.id, ownerId: req.scopeOwnerId })
  if (!item) throw new ApiError(404, 'Staff not found')
  await User.findByIdAndUpdate(item.userId, { isActive: false })
  res.json(new ApiResponse(200, {}, 'Staff removed and login deactivated'))
})
