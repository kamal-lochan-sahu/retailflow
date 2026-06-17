import Sale from '../models/Sale.js'
import dayjs from 'dayjs'

export const getRevenueByPeriod = async (ownerId, days = 30) => {
  const start = dayjs().subtract(days, 'day').startOf('day').toDate()
  return Sale.aggregate([
    { $match: { ownerId, status: 'completed', createdAt: { $gte: start } } },
    { $group: {
      _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      revenue: { $sum: '$totalAmount' },
      bills:   { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ])
}

export const getTopProducts = async (ownerId, limit = 10, days = 30) => {
  const start = dayjs().subtract(days, 'day').startOf('day').toDate()
  return Sale.aggregate([
    { $match: { ownerId, status: 'completed', createdAt: { $gte: start } } },
    { $unwind: '$items' },
    { $group: {
      _id:     '$items.productId',
      name:    { $first: '$items.name' },
      qty:     { $sum: '$items.quantity' },
      revenue: { $sum: '$items.total' }
    }},
    { $sort: { revenue: -1 } },
    { $limit: limit }
  ])
}
