import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchCustomers, createCustomer } from '../../services/customer.service.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import Modal from '../../components/common/Modal.jsx'
import { formatINR, formatDate } from '../../utils/formatCurrency.js'
import { Plus, Search, User, Phone, CreditCard } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

export default function Customers() {
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [showAdd, setShowAdd]   = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => fetchCustomers({ page, search, limit:20 }),
  })

  const { register, handleSubmit, reset, formState:{isSubmitting} } = useForm()

  const addMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      toast.success('Customer added!')
      qc.invalidateQueries(['customers'])
      reset(); setShowAdd(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed')
  })

  if (isLoading) return <PageLoader/>
  const customers  = data?.data?.data?.customers || []
  const pagination = data?.data?.data?.pagination || {}

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm">
          <Plus size={14}/> Add Customer
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
              className="input pl-9 text-sm" placeholder="Search by name or phone..."/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left">
              {['Customer','Phone','Type','Outstanding','Total Purchase','Last Visit','Action'].map(h=>(
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {customers.map(c=>(
                <tr key={c._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                        <User size={14} className="text-brand-600"/>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{c.name}</p>
                        {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.phone||'-'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge-${c.type==='vip'?'blue':c.type==='defaulter'?'red':'green'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={c.outstandingBalance>0?'text-red-600 font-semibold':'text-slate-600'}>
                      {formatINR(c.outstandingBalance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatINR(c.totalPurchase)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{c.lastVisit?formatDate(c.lastVisit):'-'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/customers/${c._id}`} className="text-brand-600 text-xs hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length===0 && (
            <div className="text-center py-16 text-slate-400">
              <User size={40} className="mx-auto mb-3 opacity-30"/>
              <p>No customers yet</p>
              <button onClick={()=>setShowAdd(true)} className="btn-primary mt-4 text-sm">Add First Customer</button>
            </div>
          )}
        </div>

        {pagination.pages>1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">{pagination.total} customers</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
              <button disabled={page===pagination.pages} onClick={()=>setPage(p=>p+1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Customer" size="sm">
        <form onSubmit={handleSubmit(d=>addMutation.mutate(d))} className="p-6 space-y-4">
          {[
            {n:'name',  l:'Name *',  t:'text',  p:'Full name'},
            {n:'phone', l:'Phone',   t:'tel',   p:'10-digit mobile'},
            {n:'email', l:'Email',   t:'email', p:'optional'},
            {n:'address',l:'Address',t:'text',  p:'optional'},
          ].map(f=>(
            <div key={f.n}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.l}</label>
              <input {...register(f.n,{required:f.l.includes('*')})} type={f.t} placeholder={f.p} className="input text-sm"/>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select {...register('type')} className="input text-sm">
              {['regular','wholesale','vip'].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit ₹</label>
            <input {...register('creditLimit')} type="number" defaultValue={0} className="input text-sm"/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={()=>setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting?'Adding...':'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
