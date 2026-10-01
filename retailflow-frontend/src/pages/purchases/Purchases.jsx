import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import { createPurchaseReturn } from '../../services/purchaseReturn.service.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import Modal from '../../components/common/Modal.jsx'
import { formatINR, formatDate } from '../../utils/formatCurrency.js'
import { Plus, ShoppingBag, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

function ReturnItemsModal({ purchase, onClose }) {
  const qc = useQueryClient()
  const [qtys, setQtys] = useState({})
  const [refundMode, setRefundMode] = useState('credit')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: createPurchaseReturn,
    onSuccess: () => {
      toast.success('Return processed!')
      qc.invalidateQueries(['purchases'])
      setQtys({}); setNotes('')
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to process return')
  })

  const totalAmount = (purchase?.items || []).reduce((sum, item) => {
    const q = parseInt(qtys[item.productId]) || 0
    return sum + q * item.purchasePrice
  }, 0)

  const handleSubmit = () => {
    const items = (purchase.items || [])
      .map(item => ({
        productId: item.productId,
        name:      item.name,
        quantity:  parseInt(qtys[item.productId]) || 0,
        amount:    (parseInt(qtys[item.productId]) || 0) * item.purchasePrice,
      }))
      .filter(i => i.quantity > 0)
    if (items.length === 0) { toast.error('Enter a quantity to return for at least one item'); return }
    mutation.mutate({ purchaseId: purchase._id, items, refundMode, notes })
  }

  return (
    <Modal open={!!purchase} onClose={onClose} title="Return Items" size="md">
      {purchase && (
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">
            PO <span className="font-mono">{purchase.poNumber}</span> · {purchase.supplierId?.name || 'Direct'}
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(purchase.items || []).map(item => (
              <div key={item.productId} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2">
                <div className="flex-1">
                  <p className="text-sm text-slate-700">{item.name}</p>
                  <p className="text-xs text-slate-400">Purchased: {item.quantity} @ {formatINR(item.purchasePrice)}</p>
                </div>
                <input type="number" min="0" max={item.quantity}
                  value={qtys[item.productId] || ''}
                  onChange={e => setQtys(q => ({ ...q, [item.productId]: e.target.value }))}
                  className="input text-sm w-20" placeholder="0"/>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Refund Mode</label>
              <select value={refundMode} onChange={e => setRefundMode(e.target.value)} className="input text-sm">
                {['credit','cash','upi'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Return Total</label>
              <p className="input text-sm bg-slate-50 flex items-center font-semibold">{formatINR(totalAmount)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="input text-sm" placeholder="Reason (optional)"/>
          </div>

          <p className="text-xs text-slate-400">
            {refundMode === 'credit'
              ? "Credit mode reduces what you owe this supplier."
              : "Cash/UPI is a separate refund transaction — it won't touch the supplier's balance."}
          </p>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSubmit} disabled={mutation.isPending || totalAmount <= 0} className="btn-primary flex-1">
              {mutation.isPending ? 'Processing...' : 'Process Return'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Purchases() {
  const [page, setPage] = useState(1)
  const [returnPurchase, setReturnPurchase] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page],
    queryFn:  () => api.get('/purchases', { params:{ page, limit:20 } }),
  })

  if (isLoading) return <PageLoader/>
  const purchases  = data?.data?.data?.purchases  || []
  const pagination = data?.data?.data?.pagination || {}

  const statusColor = { draft:'yellow', sent:'blue', received:'green', partial:'yellow', cancelled:'red' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
        <Link to="/purchases/add" className="btn-primary text-sm"><Plus size={14}/> New Purchase</Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50">
              {['PO Number','Date','Supplier','Items','Total','Paid','Due','Status','Actions'].map(h=>(
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {purchases.map(p=>(
                <tr key={p._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-brand-600">{p.poNumber}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{p.supplierId?.name||'Direct'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.items?.length}</td>
                  <td className="px-4 py-3 font-semibold">{formatINR(p.totalAmount)}</td>
                  <td className="px-4 py-3 text-green-600">{formatINR(p.paidAmount)}</td>
                  <td className="px-4 py-3 text-red-600">{formatINR(p.dueAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge-${statusColor[p.status]||'blue'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'received' && (
                      <button onClick={() => setReturnPurchase(p)}
                        className="btn-ghost p-1.5 text-slate-400 hover:text-red-500" title="Return items">
                        <RotateCcw size={14}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchases.length===0&&(
            <div className="text-center py-16 text-slate-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-30"/>
              <p>No purchases yet</p>
              <Link to="/purchases/add" className="btn-primary mt-4 inline-flex text-sm">Add First Purchase</Link>
            </div>
          )}
        </div>
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">Showing {purchases.length} of {pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
              <button disabled={page===pagination.pages} onClick={()=>setPage(p=>p+1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <ReturnItemsModal purchase={returnPurchase} onClose={() => setReturnPurchase(null)}/>
    </div>
  )
}
