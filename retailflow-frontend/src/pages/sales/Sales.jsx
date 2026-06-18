import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR, formatDateTime } from '../../utils/formatCurrency.js'
import { Receipt, Search, Download } from 'lucide-react'

export default function Sales() {
  const [page, setPage]   = useState(1)
  const [from, setFrom]   = useState('')
  const [to,   setTo]     = useState('')
  const [mode, setMode]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, from, to, mode],
    queryFn:  () => api.get('/sales', { params:{ page, limit:20, from, to, paymentMode:mode||undefined } }),
  })

  if (isLoading) return <PageLoader/>
  const sales      = data?.data?.data?.sales      || []
  const pagination = data?.data?.data?.pagination  || {}
  const revenue    = data?.data?.data?.totalRevenue || 0

  const modeColor = { cash:'green', upi:'blue', card:'purple', credit:'red', split:'orange' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Sales</h1>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total (filtered)</p>
          <p className="text-xl font-bold text-brand-600">{formatINR(revenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="input text-sm w-36"/>
        <input type="date" value={to}   onChange={e=>setTo(e.target.value)}   className="input text-sm w-36"/>
        <select value={mode} onChange={e=>setMode(e.target.value)} className="input text-sm w-36">
          <option value="">All Modes</option>
          {['cash','upi','card','credit','split'].map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={()=>{setFrom('');setTo('');setMode('');setPage(1)}} className="btn-secondary text-sm">Clear</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50">
              {['Bill No','Date','Customer','Items','Total','Payment','Status',''].map(h=>(
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {sales.map(s=>(
                <tr key={s._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-brand-600">{s.billNumber}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(s.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{s.customerId?.name||'Walk-in'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.items?.length}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatINR(s.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge-${modeColor[s.paymentMode]||'blue'}`}>{s.paymentMode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge-${s.status==='completed'?'green':s.status==='void'?'red':'yellow'}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/sales/${s._id}`} className="text-brand-600 text-xs hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length===0&&(
            <div className="text-center py-16 text-slate-400">
              <Receipt size={40} className="mx-auto mb-3 opacity-30"/>
              <p>No sales found</p>
              <Link to="/pos" className="btn-primary mt-4 inline-flex text-sm">Make First Sale</Link>
            </div>
          )}
        </div>
        {pagination.pages>1&&(
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">{pagination.total} sales</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
              <button disabled={page===pagination.pages} onClick={()=>setPage(p=>p+1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
