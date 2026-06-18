import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import Modal from '../../components/common/Modal.jsx'
import { formatINR, formatDate } from '../../utils/formatCurrency.js'
import { CreditCard, Bell, FileText } from 'lucide-react'
import { sendReminder } from '../../services/customer.service.js'
import toast from 'react-hot-toast'

export default function UdhaarManagement() {
  const [payModal, setPayModal] = useState(null)
  const [amount, setAmount]     = useState('')
  const [payMode, setPayMode]   = useState('cash')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['udhaar'],
    queryFn:  () => api.get('/udhaar/report'),
  })

  const payMutation = useMutation({
    mutationFn: (d) => api.post('/udhaar/payment', d),
    onSuccess: () => {
      toast.success('Payment recorded!')
      qc.invalidateQueries(['udhaar'])
      setPayModal(null); setAmount('')
    },
    onError: e => toast.error(e.response?.data?.message||'Failed')
  })

  const remind = async (id) => {
    try { await sendReminder(id); toast.success('Reminder sent!') }
    catch { toast.error('Failed to send reminder') }
  }

  if (isLoading) return <PageLoader/>
  const customers = data?.data?.data?.customers || []
  const total     = data?.data?.data?.totalOutstanding || 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Udhaar / Credit</h1>
        <div className="card px-4 py-2 text-right">
          <p className="text-xs text-slate-500">Total Outstanding</p>
          <p className="text-xl font-bold text-red-600">{formatINR(total)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50">
            {['Customer','Phone','Outstanding','Last Transaction','Actions'].map(h=>(
              <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {customers.map(c=>(
              <tr key={c._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone||'-'}</td>
                <td className="px-4 py-3">
                  <span className="text-red-600 font-bold">{formatINR(c.outstandingBalance)}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{c.updatedAt?formatDate(c.updatedAt):'-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>setPayModal(c)} className="btn-primary text-xs py-1 px-2">
                      <CreditCard size={12}/> Pay
                    </button>
                    <button onClick={()=>remind(c._id)} className="btn-secondary text-xs py-1 px-2">
                      <Bell size={12}/> Remind
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length===0&&(
          <div className="text-center py-16 text-slate-400">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No pending udhaar</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={()=>setPayModal(null)} title={`Record Payment — ${payModal?.name}`} size="sm">
        <div className="p-6 space-y-4">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-sm text-red-600">Outstanding</p>
            <p className="text-2xl font-bold text-red-700">{formatINR(payModal?.outstandingBalance)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount ₹</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
              className="input" placeholder="Enter amount"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
            <select value={payMode} onChange={e=>setPayMode(e.target.value)} className="input">
              {['cash','upi','bank'].map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setPayModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={()=>payMutation.mutate({ customerId:payModal._id, amount:parseFloat(amount), paymentMode:payMode })}
              disabled={!amount||payMutation.isPending} className="btn-primary flex-1">
              {payMutation.isPending?'Recording...':'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
