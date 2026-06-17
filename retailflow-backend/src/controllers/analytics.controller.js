import Sale from '../models/Sale.js'
import Product from '../models/Product.js'
import Customer from '../models/Customer.js'
import Expense from '../models/Expense.js'
import Purchase from '../models/Purchase.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getCache, setCache } from '../config/redis.js'
import { exportSalesToExcel } from '../utils/excel.utils.js'
import dayjs from 'dayjs'

export const getDashboard = asyncHandler(async (req, res) => {
  const cacheKey = `dashboard:${req.user._id}:${dayjs().format('YYYY-MM-DD-HH')}`
  const cached   = await getCache(cacheKey)
  if (cached) return res.json(new ApiResponse(200, cached))

  const today = { $gte: dayjs().startOf('day').toDate(), $lte: dayjs().endOf('day').toDate() }
  const month = { $gte: dayjs().startOf('month').toDate(), $lte: dayjs().endOf('month').toDate() }

  const [todaySales, monthSales, pendingUdhaar, lowStockCount, recentSales, topProducts, revenue30] =
    await Promise.all([
      Sale.aggregate([
        { $match: { ownerId: req.user._id, status:'completed', createdAt: today } },
        { $group: { _id:null, total:{$sum:'$totalAmount'}, count:{$sum:1}, profit:{$sum:{$subtract:['$totalAmount', {$multiply:[{$sum:'$items.purchasePrice'},{$sum:'$items.quantity'}]}]}} } }
      ]),
      Sale.aggregate([
        { $match: { ownerId: req.user._id, status:'completed', createdAt: month } },
        { $group: { _id:null, total:{$sum:'$totalAmount'} } }
      ]),
      Customer.aggregate([
        { $match: { ownerId: req.user._id, outstandingBalance:{$gt:0} } },
        { $group: { _id:null, total:{$sum:'$outstandingBalance'}, count:{$sum:1} } }
      ]),
      Product.countDocuments({ ownerId: req.user._id, isActive:true, $expr:{$lte:['$stock','$minStock']} }),
      Sale.find({ ownerId: req.user._id, status:'completed' })
        .sort({createdAt:-1}).limit(5)
        .populate('customerId','name').lean(),
      Sale.aggregate([
        { $match: { ownerId: req.user._id, status:'completed', createdAt: today } },
        { $unwind: '$items' },
        { $group: { _id:'$items.productId', name:{$first:'$items.name'}, qty:{$sum:'$items.quantity'}, revenue:{$sum:'$items.total'} } },
        { $sort: {revenue:-1} }, { $limit: 5 }
      ]),
      Sale.aggregate([
        { $match: { ownerId: req.user._id, status:'completed', createdAt:{$gte: dayjs().subtract(30,'day').toDate()} } },
        { $group: { _id:{ $dateToString:{format:'%Y-%m-%d', date:'$createdAt'} }, revenue:{$sum:'$totalAmount'}, count:{$sum:1} } },
        { $sort: {_id:1} }
      ])
    ])

  const data = {
    today: {
      revenue: todaySales[0]?.total || 0,
      bills:   todaySales[0]?.count || 0,
    },
    month: { revenue: monthSales[0]?.total || 0 },
    pendingUdhaar:  { amount: pendingUdhaar[0]?.total || 0, count: pendingUdhaar[0]?.count || 0 },
    lowStockCount,
    recentSales,
    topProducts,
    revenue30: revenue30
  }

  await setCache(cacheKey, data, 300)
  res.json(new ApiResponse(200, data))
})

export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', from, to } = req.query
  let start, end

  if (from && to) {
    start = dayjs(from).startOf('day').toDate()
    end   = dayjs(to).endOf('day').toDate()
  } else {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30
    start = dayjs().subtract(days,'day').startOf('day').toDate()
    end   = dayjs().endOf('day').toDate()
  }

  const [salesData, paymentBreakdown] = await Promise.all([
    Sale.aggregate([
      { $match: { ownerId: req.user._id, status:'completed', createdAt:{$gte:start,$lte:end} } },
      { $group: {
        _id: { $dateToString:{format:'%Y-%m-%d', date:'$createdAt'} },
        revenue: {$sum:'$totalAmount'},
        bills:   {$sum:1},
        avgBill: {$avg:'$totalAmount'}
      }},
      { $sort: {_id:1} }
    ]),
    Sale.aggregate([
      { $match: { ownerId: req.user._id, status:'completed', createdAt:{$gte:start,$lte:end} } },
      { $group: { _id:'$paymentMode', total:{$sum:'$totalAmount'}, count:{$sum:1} } }
    ])
  ])

  res.json(new ApiResponse(200, { salesData, paymentBreakdown }))
})

export const getProfitReport = asyncHandler(async (req, res) => {
  const { period='30d' } = req.query
  const days  = period==='7d'?7:period==='30d'?30:period==='90d'?90:30
  const start = dayjs().subtract(days,'day').startOf('day').toDate()
  const end   = dayjs().endOf('day').toDate()

  const [revenue, expenses, purchases] = await Promise.all([
    Sale.aggregate([
      { $match: { ownerId:req.user._id, status:'completed', createdAt:{$gte:start,$lte:end} } },
      { $group: { _id:null, total:{$sum:'$totalAmount'}, gst:{$sum:'$gstAmount'} } }
    ]),
    Expense.aggregate([
      { $match: { ownerId:req.user._id, date:{$gte:start,$lte:end} } },
      { $group: { _id:'$category', total:{$sum:'$amount'} } }
    ]),
    Purchase.aggregate([
      { $match: { ownerId:req.user._id, status:'received', createdAt:{$gte:start,$lte:end} } },
      { $group: { _id:null, total:{$sum:'$totalAmount'} } }
    ])
  ])

  const totalRevenue   = revenue[0]?.total || 0
  const totalExpenses  = expenses.reduce((s,e) => s+e.total, 0)
  const totalPurchases = purchases[0]?.total || 0
  const grossProfit    = totalRevenue - totalPurchases
  const netProfit      = grossProfit - totalExpenses

  res.json(new ApiResponse(200, {
    period, totalRevenue, totalPurchases, grossProfit,
    totalExpenses, netProfit, expenseBreakdown: expenses,
    gstCollected: revenue[0]?.gst || 0
  }))
})

export const getGSTReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query
  const m     = parseInt(month) || dayjs().month() + 1
  const y     = parseInt(year)  || dayjs().year()
  const start = dayjs(`${y}-${m}-01`).startOf('month').toDate()
  const end   = dayjs(`${y}-${m}-01`).endOf('month').toDate()

  const gstData = await Sale.aggregate([
    { $match: { ownerId:req.user._id, isGstBill:true, status:'completed', createdAt:{$gte:start,$lte:end} } },
    { $unwind: '$items' },
    { $group: {
      _id: '$items.gstPercent',
      taxableAmount: {$sum:'$items.total'},
      gstAmount:     {$sum:'$items.gstAmount'},
      count:         {$sum:1}
    }},
    { $sort: {_id:1} }
  ])

  const totalGST     = gstData.reduce((s,g) => s+g.gstAmount, 0)
  const cgst         = totalGST / 2
  const sgst         = totalGST / 2

  res.json(new ApiResponse(200, { month:m, year:y, gstData, totalGST, cgst, sgst }))
})

export const exportReport = asyncHandler(async (req, res) => {
  const { type='sales', from, to } = req.query
  const start = from ? new Date(from) : dayjs().startOf('month').toDate()
  const end   = to   ? new Date(to)   : dayjs().endOf('day').toDate()

  if (type === 'sales') {
    const sales = await Sale.find({
      ownerId: req.user._id,
      status: 'completed',
      createdAt: { $gte: start, $lte: end }
    }).populate('customerId','name').populate('staffId','name').lean()

    const buffer = await exportSalesToExcel(sales, `${from}-${to}`)
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sales-report-${dayjs().format('YYYY-MM-DD')}.xlsx"`
    }).send(buffer)
  }
})
