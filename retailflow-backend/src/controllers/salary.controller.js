import Salary from '../models/Salary.js'
import Staff from '../models/Staff.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const paySalary = asyncHandler(async (req, res) => {
  const { staffId, month, year, basicSalary, commission=0, advance=0, deductions=0, bonus=0, paymentMode, note } = req.body
  const staff = await Staff.findOne({ _id: staffId, ownerId: req.user._id })
  if (!staff) throw new ApiError(404, 'Staff not found')

  const existing = await Salary.findOne({ staffId, month, year })
  if (existing) throw new ApiError(409, 'Salary already paid for this month')

  const netSalary = basicSalary + commission + bonus - advance - deductions

  const salary = await Salary.create({
    ownerId: req.user._id,
    staffId, userId: staff.userId,
    month, year,
    basicSalary, commission, advance, deductions, bonus,
    netSalary, paidDate: new Date(), paymentMode, note, status: 'paid'
  })

  res.status(201).json(new ApiResponse(201, salary, 'Salary paid'))
})

export const getSalaryHistory = asyncHandler(async (req, res) => {
  const history = await Salary.find({ staffId: req.params.staffId, ownerId: req.user._id })
    .sort({ year:-1, month:-1 }).lean()
  res.json(new ApiResponse(200, history))
})
