import OnlineOrder from '../models/OnlineOrder.js'
import Product from '../models/Product.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendOrderStatusWhatsApp } from '../utils/whatsapp.utils.js'
import { io } from '../../server.js'

export const getOrders = asyncHandler(async (req, res) => {
  const { status, page=1, limit=20 } = req.query
  const filter = { ownerId: req.user._id }
  if (status) filter.status = status
  const skip = (parseInt(page)-1)*parseInt(limit)
  const [orders, total] = await Promise.all([
    OnlineOrder.find(filter).sort({createdAt:-1}).skip(skip).limit(parseInt(limit)).lean(),
    OnlineOrder.countDocuments(filter)
  ])
  res.json(new ApiResponse(200, { orders, pagination:{total, page:parseInt(page), pages:Math.ceil(total/limit)} }))
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body
  const order = await OnlineOrder.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    {
      status,
      $push: { statusHistory: { status, note, updatedBy: req.user._id } },
      ...(status === 'delivered' && { deliveredAt: new Date() })
    },
    { new: true }
  )
  if (!order) throw new ApiError(404, 'Order not found')
  io.to(req.user._id.toString()).emit('order_update', { orderId: order.orderId, status })
  if (order.phone) {
    await sendOrderStatusWhatsApp(order.phone, order, process.env.SHOP_NAME).catch(()=>{})
  }
  res.json(new ApiResponse(200, order, 'Status updated'))
})

export const assignDelivery = asyncHandler(async (req, res) => {
  const order = await OnlineOrder.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    { deliveryPersonId: req.body.deliveryPersonId, status: 'out_for_delivery',
      $push: { statusHistory: { status:'out_for_delivery', note:'Delivery assigned' } } },
    { new: true }
  )
  if (!order) throw new ApiError(404, 'Order not found')
  res.json(new ApiResponse(200, order))
})
