import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Download, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchGSTR1 } from '../../services/gstr1.service.js'
import { formatINR } from '../../utils/formatCurrency.js'

const ICON = { error: AlertCircle, warn: AlertTriangle, info: Info }
const TONE = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warn:  'border-amber-200 bg-amber-50 text-amber-800',
  info:  'border-slate-200 bg-slate-50 text-slate-600',
}

const lastMonth = () => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function GSTR1() {
  const [period, setPeriod] = useState(lastMonth())
  const [result, setResult] = useState(null)

  const gen = useMutation({
    mutationFn: () => {
      const [year, month] = period.split('-').map(Number)
      return fetchGSTR1({ month, year })
    },
    onSuccess: (res) => setResult(res.data.data),
    onError: (e) => { setResult(null); toast.error(e.response?.data?.message || 'Could not generate GSTR-1') },
  })

  const download = () => {
    const blob = new Blob([JSON.stringify(result.json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `GSTR1_${result.gstin}_${result.json.fp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const s = result?.summary
  const issues = result?.issues || []
  const errors = issues.filter(i => i.severity === 'error').length
  const hsn = [...(result?.json?.hsn?.hsn_b2b || []), ...(result?.json?.hsn?.hsn_b2c || [])]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">GST Returns — GSTR-1</h1>
        <p className="text-sm text-slate-500 mt-0.5">Monthly outward-supplies file for the GST Offline Tool / portal</p>
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Return period</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="input text-sm" />
        </div>
        <button onClick={() => gen.mutate()} disabled={!period || gen.isPending} className="btn-primary">
          <FileText size={16} /> {gen.isPending ? 'Generating…' : 'Generate'}
        </button>
        {result && (
          <button onClick={download} className="btn-secondary ml-auto">
            <Download size={16} /> Download JSON
          </button>
        )}
      </div>

      {gen.isError && gen.error?.response?.data?.message?.includes('GSTIN') && (
        <p className="text-sm text-slate-600">Go to <Link to="/settings" className="text-brand-600 underline">Settings</Link> and fill in your shop GSTIN.</p>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Invoices', `${s.invoices}${s.cancelled ? ` (+${s.cancelled} cancelled)` : ''}`],
              ['B2B invoices', `${s.b2bInvoices} · ${s.b2bCustomers} customer(s)`],
              ['Taxable value', formatINR(s.taxable)],
              ['GST charged', formatINR(s.tax)],
              ['B2C summary rows', s.b2csRows],
              ['Credit notes (B2B)', s.creditNotes],
              ['Nil-rated value', formatINR(s.nilRated)],
              ['HSN rows', s.hsnRows],
            ].map(([k, v]) => (
              <div key={k} className="card p-3">
                <p className="text-xs text-slate-500">{k}</p>
                <p className="text-base font-semibold text-slate-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          <div className="card p-4 space-y-2">
            <h2 className="font-semibold text-slate-800">
              Check before filing {errors > 0 && <span className="text-red-600 text-sm font-normal">— {errors} problem(s) to fix</span>}
            </h2>
            {issues.map((i, idx) => {
              const Icon = ICON[i.severity]
              return (
                <div key={idx} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${TONE[i.severity]}`}>
                  <Icon size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p>{i.message}{i.count > 1 && <span className="opacity-70"> ({i.count})</span>}</p>
                    {i.examples.length > 0 && <p className="text-xs opacity-80 mt-0.5 font-mono break-all">e.g. {i.examples.join(', ')}</p>}
                  </div>
                </div>
              )
            })}
          </div>

          {hsn.length > 0 && (
            <div className="card overflow-x-auto">
              <h2 className="font-semibold text-slate-800 p-4 pb-2">HSN summary</h2>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  {['HSN', 'Description', 'UQC', 'Qty', 'Rate', 'Taxable', 'Tax'].map(h => (
                    <th key={h} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {hsn.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-mono">{r.hsn_sc}</td>
                      <td className="px-4 py-2">{r.desc}</td>
                      <td className="px-4 py-2">{r.uqc}</td>
                      <td className="px-4 py-2">{r.qty}</td>
                      <td className="px-4 py-2">{r.rt}%</td>
                      <td className="px-4 py-2">{formatINR(r.txval)}</td>
                      <td className="px-4 py-2">{formatINR((r.iamt || 0) + (r.camt || 0) + (r.samt || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Import the downloaded file in the GST Offline Tool (or upload on the portal), let it validate, and have your CA review before filing.
            This is a best-effort export built from your bills — it is not a filed return.
          </p>
        </>
      )}
    </div>
  )
}
