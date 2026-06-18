import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboard, fetchSales, fetchProfit } from '../../services/analytics.service.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import StatsCard from '../../components/analytics/StatsCard.jsx'
import { formatINR } from '../../utils/formatCurrency.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, ShoppingCart, CreditCard, DollarSign } from 'lucide-react'

const COLORS = ['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed']

export default function Analytics() {
  const [period, setPeriod] = useState('30d')

  const { data: dash }    = useQuery({ queryKey:['dashboard'],          queryFn: fetchDashboard })
  const { data: salesData }= useQuery({ queryKey:['analytics-sales', period], queryFn: ()=>fetchSales({period}) })
  const { data: profit }  = useQuery({ queryKey:['analytics-profit', period], queryFn: ()=>fetchProfit({period}) })

  const sales   = salesData?.data?.data?.salesData        || []
  const payment = salesData?.data?.data?.paymentBreakdown || []
  const p       = profit?.data?.data || {}
  const d       = dash?.data?.data   || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <div className="flex gap-2">
          {['7d','30d','90d'].map(per=>(
            <button key={per} onClick={()=>setPeriod(per)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${period===per?'bg-brand-600 text-white':'btn-secondary'}`}>
              {per}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Revenue"       value={formatINR(p.totalRevenue)}   icon={TrendingUp}   color="blue"/>
        <StatsCard title="Gross Profit"  value={formatINR(p.grossProfit)}    icon={DollarSign}   color="green"/>
        <StatsCard title="Net Profit"    value={formatINR(p.netProfit)}      icon={DollarSign}   color="purple"/>
        <StatsCard title="Expenses"      value={formatINR(p.totalExpenses)}  icon={CreditCard}   color="red"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-700 mb-4">Revenue Trend</h2>
          {sales.length>0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sales}>
                <XAxis dataKey="_id" tick={{fontSize:11}} tickFormatter={v=>v.slice(5)}/>
                <YAxis tick={{fontSize:11}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>formatINR(v)}/>
                <Bar dataKey="revenue" fill="#2563eb" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-48 text-slate-300">No data</div>}
        </div>

        {/* Payment Breakdown */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Payment Modes</h2>
          {payment.length>0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={payment} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={70} label={({_id})=>_id}>
                  {payment.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Legend/>
                <Tooltip formatter={v=>formatINR(v)}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-48 text-slate-300">No data</div>}
        </div>
      </div>

      {/* P&L Summary */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-700 mb-4">P&L Summary — {period}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          {[
            {l:'Revenue',       v:p.totalRevenue,   c:'text-blue-600'},
            {l:'Purchases',     v:p.totalPurchases, c:'text-orange-600'},
            {l:'Gross Profit',  v:p.grossProfit,    c:'text-green-600'},
            {l:'Expenses',      v:p.totalExpenses,  c:'text-red-600'},
            {l:'Net Profit',    v:p.netProfit,      c:'text-purple-600'},
          ].map(item=>(
            <div key={item.l} className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">{item.l}</p>
              <p className={`text-lg font-bold mt-1 ${item.c}`}>{formatINR(item.v||0)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
