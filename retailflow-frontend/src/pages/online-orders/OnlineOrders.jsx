import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR, formatDateTime } from '../../utils/formatCurrency.js'
import { Globe } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS = { placed:'blue', confirmed:'yellow', packed:'purple', out_for_delivery:'orange', delivered:'green', cancelled:'red' }
const NEXT_STATUS   = { placed:'confirmed', confirmed:'packed', packed:'out_for_delivery', out_for_delivery:'delivered' }

export default function OnlineOrders() {
  const [filter, setFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey:['orders', filter],
    queryFn: ()=>api.get('/orders', { params:{ status:filter||undefined } }),
  })

  const updateMutation = useMutation({
    mutationFn: ({id, status})=>api.put(`/orders/${id}/status`, {status}),
    onSuccess: ()=>{ toast.success('Status updated!'); qc.invalidateQueries(['orders']) },
    onError: e=>toast.error(e.response?.data?.message||'Failed')
  })

  if (isLoading) return <PageLoader/>
  const orders = data?.data?.data?.orders || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Online Orders</h1>
        <div className="flex gap-2">
          {['','placed','confirmed','packed','out_for_delivery','delivered'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${filter===s?'bg-brand-600 text-white':'btn-secondary'}`}>
              {s||'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {orders.map(o=>(
          <div key={o._id} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">#{o.orderId}</p>
                <p className="text-sm text-slate-500">{o.customerName} • {o.phone}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(o.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">{formatINR(o.total)}</p>
                <span className={`badge-${STATUS_COLORS[o.status]||'blue'} mt-1`}>{o.status?.replace(/_/g,' ')}</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {NEXT_STATUS[o.status] && (
                <button onClick={()=>updateMutation.mutate({id:o._id, status:NEXT_STATUS[o.status]})}
                  className="btn-primary text-xs py-1.5 px-3 capitalize">
                  Mark {NEXT_STATUS[o.status]?.replace(/_/g,' ')}
                </button>
              )}
              {o.status==='placed'&&(
                <button onClick={()=>updateMutation.mutate({id:o._id, status:'cancelled'})}
                  className="btn-danger text-xs py-1.5 px-3">Cancel</button>
              )}
            </div>
          </div>
        ))}
        {orders.length===0&&(
          <div className="card text-center py-16 text-slate-400">
            <Globe size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No orders found</p>
          </div>
        )}
      </div>
    </div>
  )
}
