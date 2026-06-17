import Sale from '../models/Sale.js'
import Expense from '../models/Expense.js'
import Purchase from '../models/Purchase.js'
import Customer from '../models/Customer.js'
import dayjs from 'dayjs'

export const buildDailyReport = async (ownerId, date = new Date()) => {
  const start = dayjs(date).startOf('day').toDate()
  const end   = dayjs(date).endOf('day').toDate()

  const [sales, expenses] = await Promise.all([
    Sale.aggregate([
      { $match: { ownerId, status: 'completed', createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id:         null,
        totalSales:  { $sum: '$totalAmount' },
        billCount:   { $sum: 1 },
        cash:        { $sum: { $cond: [{ $eq: ['$paymentMode','cash'] }, '$totalAmount', 0] } },
        upi:         { $sum: { $cond: [{ $eq: ['$paymentMode','upi']  }, '$totalAmount', 0] } },
        card:        { $sum: { $cond: [{ $eq: ['$paymentMode','card'] }, '$totalAmount', 0] } },
        credit:      { $sum: '$creditAmount' },
      }}
    ]),
    Expense.aggregate([
      { $match: { ownerId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ])

  return {
    date:        dayjs(date).format('DD MMM YYYY'),
    totalSales:  sales[0]?.totalSales  || 0,
    billCount:   sales[0]?.billCount   || 0,
    cash:        sales[0]?.cash        || 0,
    upi:         sales[0]?.upi         || 0,
    card:        sales[0]?.card        || 0,
    credit:      sales[0]?.credit      || 0,
    expenses:    expenses[0]?.total    || 0,
  }
}
