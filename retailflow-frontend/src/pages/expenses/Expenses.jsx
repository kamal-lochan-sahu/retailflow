import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api.js'
import Modal from '../../components/common/Modal.jsx'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR, formatDate } from '../../utils/formatCurrency.js'
import { Plus, Wallet } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const CATS = ['rent','salary','electricity','maintenance','transport','marketing','other']

export default function Expenses() {
  const [showAdd, setShowAdd] = useState(false)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey:['expenses'],
    queryFn: ()=>api.get('/expenses'),
  })
  const { register, handleSubmit, reset, formState:{isSubmitting} } = useForm()
  const addMutation = useMutation({
    mutationFn: (d)=>api.post('/expenses',d),
    onSuccess: ()=>{ toast.success('Expense added!'); qc.invalidateQueries(['expenses']); reset(); setShowAdd(false) },
    onError: e=>toast.error(e.response?.data?.message||'Failed')
  })

  if (isLoading) return <PageLoader/>
  const expenses = data?.data?.data || []
  const total    = expenses.reduce((s,e)=>s+e.amount,0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Total: <span className="font-semibold text-red-600">{formatINR(total)}</span></p>
        </div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm"><Plus size={14}/> Add Expense</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50">
            {['Date','Category','Amount','Description'].map(h=>(
              <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {expenses.map(e=>(
              <tr key={e._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(e.date)}</td>
                <td className="px-4 py-3"><span className="badge-blue capitalize">{e.category}</span></td>
                <td className="px-4 py-3 font-semibold text-red-600">{formatINR(e.amount)}</td>
                <td className="px-4 py-3 text-slate-500">{e.description||'-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length===0&&(
          <div className="text-center py-16 text-slate-400">
            <Wallet size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No expenses recorded</p>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Expense" size="sm">
        <form onSubmit={handleSubmit(d=>addMutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
            <select {...register('category',{required:true})} className="input text-sm">
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount ₹ *</label>
            <input {...register('amount',{required:true})} type="number" className="input text-sm" placeholder="0"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input {...register('description')} className="input text-sm" placeholder="Optional"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input {...register('date')} type="date" className="input text-sm"
              defaultValue={new Date().toISOString().split('T')[0]}/>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={()=>setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting?'Adding...':'Add'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
