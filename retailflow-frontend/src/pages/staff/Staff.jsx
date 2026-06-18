import { useQuery } from '@tanstack/react-query'
import api from '../../services/api.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR, formatDate } from '../../utils/formatCurrency.js'
import { UserCheck } from 'lucide-react'

export default function Staff() {
  const { data, isLoading } = useQuery({
    queryKey:['staff'],
    queryFn: ()=>api.get('/staff'),
  })
  if (isLoading) return <PageLoader/>
  const staff = data?.data?.data || []

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Staff</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50">
            {['Name','Role','Designation','Salary','Joining Date','Status'].map(h=>(
              <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map(s=>(
              <tr key={s._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium">{s.userId?.name||'-'}</td>
                <td className="px-4 py-3"><span className="badge-blue capitalize">{s.userId?.role||'-'}</span></td>
                <td className="px-4 py-3 text-slate-500">{s.designation||'-'}</td>
                <td className="px-4 py-3">{formatINR(s.salary?.amount||0)}/mo</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(s.joiningDate)}</td>
                <td className="px-4 py-3"><span className={`badge-${s.isActive?'green':'red'}`}>{s.isActive?'Active':'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {staff.length===0&&(
          <div className="text-center py-16 text-slate-400">
            <UserCheck size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No staff members yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
