import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { getCustomer, updateCustomer, getHistory, sendReminder } from '../../services/customer.service.js'
import { getCustomerLedger, recordUdhaarPayment } from '../../services/udhaar.service.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import Modal from '../../components/common/Modal.jsx'
import { formatINR, formatDate, formatDateTime } from '../../utils/formatCurrency.js'
import { ArrowLeft, Edit, Phone, Mail, MapPin, CreditCard, Bell, User, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'

const CUSTOMER_TYPES = ['regular','wholesale','vip','defaulter']
const LEDGER_COLOR   = { credit:'red', payment:'green', adjustment:'yellow' }
const PAY_MODE_COLOR = { cash:'green', upi:'blue', credit:'red' }

export default function CustomerDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [editOpen, setEditOpen]       = useState(false)
  const [payOpen, setPayOpen]         = useState(false)
  const [amount, setAmount]           = useState('')
  const [payMode, setPayMode]         = useState('cash')
  const [historyPage, setHistoryPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn:  () => getCustomer(id),
  })
  const { data: histData } = useQuery({
    queryKey: ['customer-history', id, historyPage],
    queryFn:  () => getHistory(id, { page: historyPage, limit: 8 }),
  })
  const { data: ledgerData } = useQuery({
    queryKey: ['udhaar-ledger', id],
    queryFn:  () => getCustomerLedger(id),
  })

  const customer   = data?.data?.data
  const sales      = histData?.data?.data?.sales || []
  const salesPages = histData?.data?.data?.pagination || {}
  const ledger     = ledgerData?.data?.data?.ledger || []

  const editForm = useForm()

  const openEdit = () => {
    editForm.reset({
      name:        customer.name || '',
      phone:       customer.phone || '',
      email:       customer.email || '',
      address:     customer.address || '',
      gstin:       customer.gstin || '',
      type:        customer.type || 'regular',
      creditLimit: customer.creditLimit ?? 0,
      notes:       customer.notes || '',
      isBlocked:   customer.isBlocked || false,
    })
    setEditOpen(true)
  }

  const editMutation = useMutation({
    mutationFn: (d) => updateCustomer(id, d),
    onSuccess: () => {
      toast.success('Customer updated!')
      qc.invalidateQueries(['customer', id])
      qc.invalidateQueries(['customers'])
      setEditOpen(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update customer')
  })

  const payMutation = useMutation({
    mutationFn: (d) => recordUdhaarPayment(d),
    onSuccess: () => {
      toast.success('Payment recorded!')
      qc.invalidateQueries(['customer', id])
      qc.invalidateQueries(['udhaar-ledger', id])
      qc.invalidateQueries(['customers'])
      setPayOpen(false); setAmount('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to record payment')
  })

  const remind = async () => {
    try { await sendReminder(id); toast.success('Reminder sent!') }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to send reminder') }
  }

  if (isLoading) return <PageLoader/>

  if (!customer) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <p>Customer not found.</p>
        <Link to="/customers" className="btn-primary mt-4 inline-flex text-sm">Back to Customers</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={()=>navigate('/customers')} className="btn-ghost p-2 rounded-lg"><ArrowLeft size={18}/></button>
          <div className="w-11 h-11 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-brand-600"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
              <span className={`badge-${customer.type==='vip'?'blue':customer.type==='defaulter'?'red':'green'}`}>{customer.type}</span>
              {customer.isBlocked && <span className="badge-red">Blocked</span>}
            </div>
            <p className="text-sm text-slate-500">Customer since {formatDate(customer.createdAt)}</p>
          </div>
        </div>
        <button onClick={openEdit} className="btn-secondary text-sm"><Edit size={14}/> Edit</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className={`text-xl font-bold ${customer.outstandingBalance>0?'text-red-600':'text-slate-800'}`}>{formatINR(customer.outstandingBalance)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Purchase</p>
          <p className="text-xl font-bold text-slate-800">{formatINR(customer.totalPurchase)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Visits</p>
          <p className="text-xl font-bold text-slate-800">{customer.visitCount || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Last Visit</p>
          <p className="text-xl font-bold text-slate-800">{customer.lastVisit ? formatDate(customer.lastVisit) : '—'}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-5">
          {/* Contact info */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-slate-700">Contact Info</h2>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400 flex-shrink-0"/>{customer.phone || '—'}</p>
              <p className="flex items-center gap-2 text-slate-600"><Mail size={14} className="text-slate-400 flex-shrink-0"/>{customer.email || '—'}</p>
              <p className="flex items-center gap-2 text-slate-600"><MapPin size={14} className="text-slate-400 flex-shrink-0"/>{customer.address || '—'}</p>
              {customer.gstin && <p className="text-slate-600">GSTIN: <span className="font-mono text-xs">{customer.gstin}</span></p>}
              {customer.creditLimit > 0 && <p className="text-slate-600">Credit Limit: {formatINR(customer.creditLimit)}</p>}
              {customer.memberCardNumber && <p className="text-slate-600">Card: {customer.memberCardNumber}</p>}
              {customer.tier !== 'none' && <p className="text-slate-600">Tier: <span className="capitalize">{customer.tier}</span> · {customer.loyaltyPoints || 0} pts</p>}
              {customer.birthday && <p className="text-slate-600">Birthday: {formatDate(customer.birthday)}</p>}
              {customer.notes && <p className="text-slate-500 text-xs pt-2 border-t border-slate-100">{customer.notes}</p>}
            </div>
          </div>

          {/* Udhaar / Credit */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">Udhaar / Credit</h2>
              <CreditCard size={16} className="text-slate-400"/>
            </div>
            <div className="flex gap-2">
              <button disabled={!customer.outstandingBalance} onClick={()=>setPayOpen(true)}
                className="btn-primary text-xs flex-1 disabled:opacity-40">Record Payment</button>
              <button disabled={!customer.outstandingBalance || !customer.phone} onClick={remind}
                className="btn-secondary text-xs flex-1 disabled:opacity-40"><Bell size={12}/> Remind</button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pt-1">
              {ledger.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No ledger entries yet</p>}
              {ledger.map(l => (
                <div key={l._id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                  <div>
                    <span className={`badge-${LEDGER_COLOR[l.type] || 'blue'}`}>{l.type}</span>
                    <p className="text-slate-400 mt-1">{formatDateTime(l.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${l.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                      {l.type === 'payment' ? '-' : '+'}{formatINR(l.amount)}
                    </p>
                    <p className="text-slate-400">Bal: {formatINR(l.balance)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Purchase history */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Receipt size={16} className="text-slate-400"/>
              <h2 className="font-semibold text-slate-700">Purchase History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-left">
                  {['Bill #','Date','Items','Total','Payment',''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {sales.map(s => (
                    <tr key={s._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.billNumber}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(s.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-500">{s.items?.length || 0}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatINR(s.totalAmount)}</td>
                      <td className="px-4 py-3"><span className={`badge-${PAY_MODE_COLOR[s.paymentMode] || 'blue'}`}>{s.paymentMode}</span></td>
                      <td className="px-4 py-3"><Link to={`/sales/${s._id}`} className="text-brand-600 text-xs hover:underline">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sales.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Receipt size={40} className="mx-auto mb-3 opacity-30"/>
                  <p>No purchases yet</p>
                </div>
              )}
            </div>
            {salesPages.pages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500">{salesPages.total} orders</span>
                <div className="flex gap-2">
                  <button disabled={historyPage===1} onClick={()=>setHistoryPage(p=>p-1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
                  <button disabled={historyPage===salesPages.pages} onClick={()=>setHistoryPage(p=>p+1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Edit Customer" size="sm">
        <form onSubmit={editForm.handleSubmit(d=>editMutation.mutate(d))} className="p-6 space-y-4">
          {[
            { n:'name',    l:'Name *',  t:'text',  req:true },
            { n:'phone',   l:'Phone',   t:'tel'   },
            { n:'email',   l:'Email',   t:'email' },
            { n:'address', l:'Address', t:'text'  },
            { n:'gstin',   l:'GSTIN',   t:'text'  },
          ].map(f => (
            <div key={f.n}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.l}</label>
              <input {...editForm.register(f.n,{required:f.req})} type={f.t} className="input text-sm"/>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select {...editForm.register('type')} className="input text-sm">
              {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit ₹</label>
            <input {...editForm.register('creditLimit')} type="number" className="input text-sm"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea {...editForm.register('notes')} rows={2} className="input text-sm resize-none"/>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...editForm.register('isBlocked')} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"/>
            Block customer (skips automated Udhaar reminders)
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={()=>setEditOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={editMutation.isPending} className="btn-primary flex-1">
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={payOpen} onClose={()=>setPayOpen(false)} title="Record Payment" size="sm">
        <div className="p-6 space-y-4">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-sm text-red-600">Outstanding</p>
            <p className="text-2xl font-bold text-red-700">{formatINR(customer.outstandingBalance)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount ₹</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="input" placeholder="Enter amount"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
            <select value={payMode} onChange={e=>setPayMode(e.target.value)} className="input">
              {['cash','upi','bank'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setPayOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={()=>payMutation.mutate({ customerId:id, amount:parseFloat(amount), paymentMode:payMode })}
              disabled={!amount || payMutation.isPending} className="btn-primary flex-1">
              {payMutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
