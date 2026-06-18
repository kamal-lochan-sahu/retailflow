import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getLowStock } from '../../services/product.service.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR } from '../../utils/formatCurrency.js'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export default function LowStock() {
  const { data, isLoading } = useQuery({ queryKey:['low-stock'], queryFn: getLowStock })
  if (isLoading) return <PageLoader/>
  const products = data?.data?.data?.products || []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/products" className="btn-ghost p-2 rounded-lg"><ArrowLeft size={18}/></Link>
        <h1 className="text-2xl font-bold text-slate-800">Low Stock ({products.length})</h1>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50">
            {['Product','SKU','Category','Current Stock','Min Stock','Selling Price'].map(h=>(
              <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {products.map(p=>(
              <tr key={p._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku||'-'}</td>
                <td className="px-4 py-3 text-slate-500">{p.category?.name||'-'}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${p.stock===0?'text-red-600':'text-yellow-600'}`}>{p.stock} {p.unit}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{p.minStock} {p.unit}</td>
                <td className="px-4 py-3 font-semibold">{formatINR(p.sellingPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length===0&&(
          <div className="text-center py-16 text-slate-400">
            <AlertTriangle size={40} className="mx-auto mb-3 opacity-30"/>
            <p>All products have sufficient stock!</p>
          </div>
        )}
      </div>
    </div>
  )
}
