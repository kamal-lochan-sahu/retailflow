import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR, formatDate } from '../../utils/formatCurrency.js'
import { Plus, ShoppingBag } from 'lucide-react'

export default function Purchases() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page],
    queryFn:  () => api.get('/purchases', { params:{ page, limit:20 } }),
  })

  if (isLoading) return <PageLoader/>
  const purchases  = data?.data?.data?.purchases  || []
  const pagination = data?.data?.data?.pagination || {}

  const statusColor = { draft:'yellow', sent:'blue', received:'green', partial:'orange', cancelled:'red' }

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
              {['PO Number','Date','Supplier','Items','Total','Paid','Due','Status'].map(h=>(
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
      </div>
    </div>
  )
}
