import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api.js'
import { createSaleReturn, fetchSaleReturns } from '../../services/saleReturn.service.js'
import { useAuthStore } from '../../store/authStore.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import Modal from '../../components/common/Modal.jsx'
import { formatINR, formatDateTime } from '../../utils/formatCurrency.js'
import { ArrowLeft, Printer, XCircle, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

// What can still be returned per product (sold on the bill minus earlier returns),
// with the per-unit refund INCLUDING GST — the server recomputes this itself.
function returnable(sale, returns) {
  const map = new Map()
  for (const line of sale.items || []) {
    const key = String(line.productId)
    const cur = map.get(key) || { productId: line.productId, name: line.name, unit: line.unit, sold: 0, gross: 0 }
    cur.sold  += Number(line.quantity) || 0
    cur.gross += (Number(line.total) || 0) + (Number(line.gstAmount) || 0)
    map.set(key, cur)
  }
  for (const r of returns) for (const it of r.items || []) {
    const cur = map.get(String(it.productId))
    if (cur) cur.returned = (cur.returned || 0) + (Number(it.quantity) || 0)
  }
  return [...map.values()].map(r => ({ ...r, returned: r.returned || 0, left: r.sold - (r.returned || 0), unit_refund: r.gross / r.sold }))
}

function ReturnModal({ sale, rows, open, onClose }) {
  const qc = useQueryClient()
  const [qtys, setQtys] = useState({})
  const [refundMode, setRefundMode] = useState('cash')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: createSaleReturn,
    onSuccess: () => {
      toast.success('Return processed')
      qc.invalidateQueries(['sale', sale._id]); qc.invalidateQueries(['sale-returns', sale._id])
      qc.invalidateQueries(['sales']); qc.invalidateQueries(['products'])
      setQtys({}); setNotes(''); onClose()
    },
    onError: e => toast.error(e.response?.data?.message || 'Return failed'),
  })

  const picked = rows.filter(r => Number(qtys[r.productId]) > 0)
  const total = picked.reduce((s, r) => s + r.unit_refund * Number(qtys[r.productId]), 0)

  const submit = () => {
    if (!picked.length) return toast.error('Enter a quantity for at least one item')
    mutation.mutate({
      saleId: sale._id, refundMode, notes: notes || undefined,
      items: picked.map(r => ({ productId: r.productId, quantity: Number(qtys[r.productId]) })),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Return Items" size="md">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-500">Bill <span className="font-mono">{sale.billNumber}</span></p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {rows.map(r => (
            <div key={r.productId} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{r.name}</p>
                <p className="text-xs text-slate-400">
                  Sold {r.sold}{r.returned > 0 && ` · returned ${r.returned}`} · {formatINR(r.unit_refund)} each incl. GST
                </p>
              </div>
              <input type="number" min="0" max={r.left} step="any" disabled={r.left <= 0}
                value={qtys[r.productId] ?? ''} placeholder="0"
                onChange={e => setQtys(q => ({ ...q, [r.productId]: Math.min(Number(e.target.value) || 0, r.left) || '' }))}
                className="input w-20 text-right" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Refund as</label>
          <select value={refundMode} onChange={e => setRefundMode(e.target.value)} className="input">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            {sale.customerId && <option value="credit">Credit to customer's Udhaar balance</option>}
          </select>
        </div>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="input" />
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-slate-500">Refund total</span>
          <span className="text-lg font-bold text-slate-800">{formatINR(total)}</span>
        </div>
        <button onClick={submit} disabled={mutation.isPending || !picked.length} className="btn-primary w-full justify-center">
          <RotateCcw size={15}/> {mutation.isPending ? 'Processing…' : 'Process Return'}
        </button>
      </div>
    </Modal>
  )
}

export default function SaleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore(s => s.user?.role)
  const canReturn = role === 'owner' || role === 'manager'
  const [returning, setReturning] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn:  () => api.get(`/sales/${id}`),
  })
  const { data: retData } = useQuery({
    queryKey: ['sale-returns', id],
    queryFn:  () => fetchSaleReturns(id),
  })

  const voidMutation = useMutation({
    mutationFn: () => api.put(`/sales/${id}/void`),
    onSuccess: () => { toast.success('Sale voided'); qc.invalidateQueries(['sale',id]) },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  if (isLoading) return <PageLoader/>
  const s = data?.data?.data

  if (!s) return <div className="text-center py-16 text-slate-400">Sale not found</div>

  const returns = retData?.data?.data || []
  const rows = returnable(s, returns)
  const canReturnMore = canReturn && s.status !== 'void' && s.status !== 'hold' && rows.some(r => r.left > 0)

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

        <div className="flex flex-wrap gap-3 pt-2">
          <a href={`/api/sales/${id}/bill`} target="_blank" className="btn-secondary flex-1 justify-center">
            <Printer size={15}/> Print Bill
          </a>
          {canReturnMore&&(
            <button onClick={()=>setReturning(true)} className="btn-secondary flex-1 justify-center">
              <RotateCcw size={15}/> Return
            </button>
          )}
          {s.status==='completed'&&returns.length===0&&(
            <button onClick={()=>voidMutation.mutate()} disabled={voidMutation.isPending}
              className="btn-danger flex-1 justify-center">
              <XCircle size={15}/>{voidMutation.isPending?'Voiding...':'Void Sale'}
            </button>
          )}
        </div>
      </div>

      {returns.length>0&&(
        <div className="card p-6 space-y-3">
          <h2 className="font-semibold text-slate-800">Returns</h2>
          {returns.map(r=>(
            <div key={r._id} className="text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between">
                <span className="font-mono font-medium">{r.returnNumber}</span>
                <span className="font-semibold">{formatINR(r.totalAmount)} <span className="text-xs text-slate-400 font-normal capitalize">· {r.refundMode}</span></span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(r.createdAt)}</p>
              <p className="text-xs text-slate-600 mt-1">{r.items.map(i=>`${i.name} × ${i.quantity}`).join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      {returning&&<ReturnModal sale={s} rows={rows} open={returning} onClose={()=>setReturning(false)}/>}
    </div>
  )
}
