import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api.js'
import Modal from '../../components/common/Modal.jsx'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR } from '../../utils/formatCurrency.js'
import { Plus, Truck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

export default function Suppliers() {
  const [showAdd, setShowAdd] = useState(false)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey:['suppliers'],
    queryFn: ()=>api.get('/suppliers'),
  })
  const { register, handleSubmit, reset, formState:{isSubmitting} } = useForm()
  const addMutation = useMutation({
    mutationFn: (d)=>api.post('/suppliers',d),
    onSuccess: ()=>{ toast.success('Supplier added!'); qc.invalidateQueries(['suppliers']); reset(); setShowAdd(false) },
    onError: e=>toast.error(e.response?.data?.message||'Failed')
  })

  if (isLoading) return <PageLoader/>
  const suppliers = data?.data?.data || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
        <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm"><Plus size={14}/> Add Supplier</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50">
            {['Name','Phone','Email','GSTIN','Outstanding','Rating'].map(h=>(
              <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {suppliers.map(s=>(
              <tr key={s._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                <td className="px-4 py-3 text-slate-500">{s.phone||'-'}</td>
                <td className="px-4 py-3 text-slate-500">{s.email||'-'}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.gstin||'-'}</td>
                <td className="px-4 py-3 text-red-600 font-semibold">{formatINR(s.outstandingBalance)}</td>
                <td className="px-4 py-3">{'⭐'.repeat(s.rating||3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length===0&&(
          <div className="text-center py-16 text-slate-400">
            <Truck size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No suppliers yet</p>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Add Supplier" size="sm">
        <form onSubmit={handleSubmit(d=>addMutation.mutate(d))} className="p-6 space-y-4">
          {[{n:'name',l:'Name *',p:'Supplier name'},{n:'phone',l:'Phone',p:'Mobile'},{n:'email',l:'Email',p:'Email'},{n:'gstin',l:'GSTIN',p:'GST number'},{n:'address',l:'Address',p:'Full address'}].map(f=>(
            <div key={f.n}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.l}</label>
              <input {...register(f.n,{required:f.l.includes('*')})} className="input text-sm" placeholder={f.p}/>
            </div>
          ))}
          <div className="flex gap-3">
            <button type="button" onClick={()=>setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting?'Adding...':'Add Supplier'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
