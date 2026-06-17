import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchDashboard } from '../services/analytics.service.js'
import StatsCard from '../components/analytics/StatsCard.jsx'
import { PageLoader } from '../components/common/Loader.jsx'
import { formatINR, formatDateTime } from '../utils/formatCurrency.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ShoppingCart, TrendingUp, AlertTriangle, CreditCard, Package, Users } from 'lucide-react'

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, refetchInterval: 60000 })

  if (isLoading) return <PageLoader/>

  const d = data?.data?.data || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <Link to="/pos" className="btn-primary">
          <ShoppingCart size={16}/> New Sale
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Today's Sales"    value={formatINR(d.today?.revenue)} sub={`${d.today?.bills || 0} bills`}         icon={TrendingUp} color="blue"/>
        <StatsCard title="Month Revenue"   value={formatINR(d.month?.revenue)}  sub="This month"                              icon={BarChart}   color="green"/>
        <StatsCard title="Pending Udhaar"  value={formatINR(d.pendingUdhaar?.amount)} sub={`${d.pendingUdhaar?.count || 0} customers`} icon={CreditCard} color="red"/>
        <StatsCard title="Low Stock Items" value={d.lowStockCount || 0}          sub="Need reorder"                           icon={Package}    color="yellow"/>
      </div>

      {/* Revenue chart */}
      {d.revenue30?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Revenue — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.revenue30} margin={{ top:0, right:10, left:0, bottom:0 }}>
              <XAxis dataKey="_id" tick={{ fontSize:11 }} tickFormatter={v => v.slice(5)}/>
              <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={(v) => formatINR(v)} labelFormatter={l => `Date: ${l}`}/>
              <Bar dataKey="revenue" fill="#2563eb" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Top Products Today</h2>
          {d.topProducts?.length ? (
            <div className="space-y-3">
              {d.topProducts.map((p, i) => (
                <div key={p._id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">{i+1}</span>
                  <span className="flex-1 text-sm text-slate-700 truncate">{p.name}</span>
                  <span className="text-sm font-semibold text-slate-800">{formatINR(p.revenue)}</span>
                  <span className="text-xs text-slate-400">{p.qty} sold</span>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm text-center py-8">No sales today yet</p>}
        </div>

        {/* Recent Sales */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Recent Sales</h2>
            <Link to="/sales" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {d.recentSales?.length ? (
            <div className="space-y-3">
              {d.recentSales.map(sale => (
                <Link to={`/sales/${sale._id}`} key={sale._id} className="flex items-center gap-3 hover:bg-slate-50 rounded-lg p-2 -mx-2 transition">
                  <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center">
                    <ShoppingCart size={14} className="text-brand-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{sale.billNumber}</p>
                    <p className="text-xs text-slate-400">{sale.customerId?.name || 'Walk-in'} • {formatDateTime(sale.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{formatINR(sale.totalAmount)}</span>
                </Link>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm text-center py-8">No recent sales</p>}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to:'/pos',          label:'New Sale',       icon:ShoppingCart, color:'bg-blue-600'   },
            { to:'/products/add', label:'Add Product',    icon:Package,      color:'bg-green-600'  },
            { to:'/purchases/add',label:'Record Purchase',icon:TrendingUp,   color:'bg-purple-600' },
            { to:'/customers',    label:'Add Customer',   icon:Users,        color:'bg-orange-600' },
          ].map(a => (
            <Link key={a.to} to={a.to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 border border-slate-100 transition">
              <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center`}>
                <a.icon size={18} className="text-white"/>
              </div>
              <span className="text-xs font-medium text-slate-700 text-center">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
