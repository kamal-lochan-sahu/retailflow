import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR, formatDateTime } from '../../utils/formatCurrency.js'
import { ArrowLeft, Printer, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SaleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn:  () => api.get(`/sales/${id}`),
  })

  const voidMutation = useMutation({
    mutationFn: () => api.put(`/sales/${id}/void`),
    onSuccess: () => { toast.success('Sale voided'); qc.invalidateQueries(['sale',id]) },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  if (isLoading) return <PageLoader/>
  const s = data?.data?.data

  if (!s) return <div className="text-center py-16 text-slate-400">Sale not found</div>

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/sales')} className="btn-ghost p-2 rounded-lg"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-bold text-slate-800">{s.billNumber}</h1>
        <span className={`badge-${s.status==='completed'?'green':s.status==='void'?'red':'yellow'} ml-auto`}>{s.status}</span>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-500">Date</p><p className="font-medium">{formatDateTime(s.createdAt)}</p></div>
          <div><p className="text-slate-500">Customer</p><p className="font-medium">{s.customerId?.name||'Walk-in'}</p></div>
          <div><p className="text-slate-500">Staff</p><p className="font-medium">{s.staffId?.name||'-'}</p></div>
          <div><p className="text-slate-500">Payment</p><p className="font-medium capitalize">{s.paymentMode}</p></div>
        </div>

        <hr className="border-slate-100"/>

        <table className="w-full text-sm">
          <thead><tr className="text-slate-500 text-xs uppercase">
            <th className="text-left pb-2">Item</th>
            <th className="text-right pb-2">Qty</th>
            <th className="text-right pb-2">Price</th>
            <th className="text-right pb-2">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {s.items?.map((item,i)=>(
              <tr key={i}>
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-right">{item.quantity} {item.unit}</td>
                <td className="py-2 text-right">{formatINR(item.sellingPrice)}</td>
                <td className="py-2 text-right font-medium">{formatINR(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="border-slate-100"/>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatINR(s.subtotal)}</span></div>
          {s.discountAmount>0&&<div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatINR(s.discountAmount)}</span></div>}
          {s.gstAmount>0&&<div className="flex justify-between text-slate-600"><span>GST</span><span>{formatINR(s.gstAmount)}</span></div>}
          <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-100">
            <span>Total</span><span>{formatINR(s.totalAmount)}</span>
          </div>
          {s.creditAmount>0&&<div className="flex justify-between text-red-600 text-xs"><span>Credit (Udhaar)</span><span>{formatINR(s.creditAmount)}</span></div>}
        </div>

        <div className="flex gap-3 pt-2">
          <a href={`/api/sales/${id}/bill`} target="_blank" className="btn-secondary flex-1 justify-center">
            <Printer size={15}/> Print Bill
          </a>
          {s.status==='completed'&&(
            <button onClick={()=>voidMutation.mutate()} disabled={voidMutation.isPending}
              className="btn-danger flex-1 justify-center">
              <XCircle size={15}/>{voidMutation.isPending?'Voiding...':'Void Sale'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
