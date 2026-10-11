import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../../services/auditLog.service.js'
import Modal from '../../components/common/Modal.jsx'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatDateTime } from '../../utils/formatCurrency.js'
import { History, Eye, Trash2 } from 'lucide-react'

const MODELS = ['Branch', 'Category', 'Supplier', 'Expense', 'Notification', 'Staff', 'Product']

export default function AuditTrail() {
  const [page, setPage]     = useState(1)
  const [model, setModel]   = useState('')
  const [viewing, setViewing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, model],
    queryFn: () => fetchAuditLogs({ page, limit: 20, ...(model ? { model } : {}) }),
  })

  if (isLoading) return <PageLoader/>
  const logs       = data?.data?.data?.logs || []
  const pagination = data?.data?.data?.pagination || {}

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-0.5">Every deleted record, who removed it, and when</p>
        </div>
        <select
          value={model}
          onChange={e => { setModel(e.target.value); setPage(1) }}
          className="input text-sm w-44"
        >
          <option value="">All types</option>
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50">
            {['Deleted At', 'Type', 'Item', 'Deleted By', ''].map(h => (
              <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {logs.map(log => (
              <tr key={log._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                    <Trash2 size={12}/> {log.model}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{log.label || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{log.deletedBy?.name || 'Unknown'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setViewing(log)} className="btn-ghost text-xs py-1.5 px-2.5">
                    <Eye size={14}/> Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <History size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No deletions recorded{model ? ` for ${model}` : ''} yet</p>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">Showing {logs.length} of {pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
              <button disabled={page===pagination.pages} onClick={()=>setPage(p=>p+1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.model} — ${viewing.label || ''}` : ''} size="lg">
        {viewing && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Deleted At</p>
                <p className="text-slate-800">{formatDateTime(viewing.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Deleted By</p>
                <p className="text-slate-800">{viewing.deletedBy?.name || 'Unknown'} {viewing.deletedBy?.email ? `(${viewing.deletedBy.email})` : ''}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Record Snapshot</p>
              <pre className="bg-slate-50 rounded-lg p-4 text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(viewing.snapshot, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
