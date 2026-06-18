import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getExpiring } from '../../services/product.service.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatDate } from '../../utils/formatCurrency.js'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import dayjs from 'date-fns'

export default function ExpiryAlerts() {
  const { data, isLoading } = useQuery({ queryKey:['expiring'], queryFn: ()=>getExpiring(30) })
  if (isLoading) return <PageLoader/>
  const batches = data?.data?.data?.batches || []

  const getDaysLeft = (date) => {
    const diff = new Date(date) - new Date()
    return Math.ceil(diff / (1000*60*60*24))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/products" className="btn-ghost p-2 rounded-lg"><ArrowLeft size={18}/></Link>
        <h1 className="text-2xl font-bold text-slate-800">Expiry Alerts ({batches.length})</h1>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50">
            {['Product','Batch No','Expiry Date','Days Left','Qty Remaining'].map(h=>(
              <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {batches.map(b=>{
              const days = getDaysLeft(b.expiryDate)
              return (
                <tr key={b._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium">{b.productId?.name||'-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.batchNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(b.expiryDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${days<=7?'text-red-600':days<=15?'text-orange-600':'text-yellow-600'}`}>
                      {days} days
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.remainingQty}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {batches.length===0&&(
          <div className="text-center py-16 text-slate-400">
            <AlertTriangle size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No products expiring in next 30 days!</p>
          </div>
        )}
      </div>
    </div>
  )
}
