import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api.js'
import { searchProducts } from '../../services/product.service.js'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatINR } from '../../utils/formatCurrency.js'

export default function AddPurchase() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [items, setItems]       = useState([])
  const [supplierSearch, setSS] = useState('')
  const [prodSearch, setPS]     = useState('')
  const [prodResults, setPR]    = useState([])
  const [submitting, setSub]    = useState(false)
  const [notes, setNotes]       = useState('')

  const searchProd = async (q) => {
    setPS(q)
    if (!q.trim()) return setPR([])
    const { data } = await searchProducts(q)
    setPR(data.data.products||[])
  }

  const addItem = (p) => {
    const exists = items.find(i=>i.productId===p._id)
    if (exists) return toast.error('Already added')
    setItems([...items, {
      productId: p._id, name: p.name, sku: p.sku,
      quantity: 1, purchasePrice: p.purchasePrice||0,
      mrp: p.mrp||0, sellingPrice: p.sellingPrice||0,
      gstPercent: p.gstPercent||0, batchNumber:'', expiryDate:''
    }])
    setPS(''); setPR([])
  }

  const updateItem = (idx, field, val) => {
    const updated = [...items]
    updated[idx][field] = val
    setItems(updated)
  }

  const total = items.reduce((s,i)=>s+(parseFloat(i.quantity)||0)*(parseFloat(i.purchasePrice)||0),0)

  const submit = async () => {
    if (!items.length) return toast.error('Add at least one item')
    setSub(true)
    try {
      const purchase = await api.post('/purchases', {
        items: items.map(i=>({
          productId:     i.productId,
          quantity:      parseFloat(i.quantity),
          purchasePrice: parseFloat(i.purchasePrice),
          mrp:           parseFloat(i.mrp)||0,
          sellingPrice:  parseFloat(i.sellingPrice)||0,
          gstPercent:    parseFloat(i.gstPercent)||0,
          batchNumber:   i.batchNumber||undefined,
          expiryDate:    i.expiryDate||undefined,
        })),
        notes, status:'draft',
        subtotal: total, totalAmount: total, dueAmount: total
      })
      // Auto receive
      await api.post(`/purchases/${purchase.data.data._id}/receive`)
      toast.success('Stock received!')
      qc.invalidateQueries(['products'])
      navigate('/purchases')
    } catch(e) {
      toast.error(e.response?.data?.message||'Failed')
    } finally { setSub(false) }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/purchases')} className="btn-ghost p-2 rounded-lg"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-bold text-slate-800">New Purchase</h1>
      </div>

      {/* Product Search */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Add Products</h2>
        <div className="relative">
          <input value={prodSearch} onChange={e=>searchProd(e.target.value)}
            className="input text-sm" placeholder="Search product to add..."/>
          {prodResults.length>0&&(
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
              {prodResults.map(p=>(
                <button key={p._id} onClick={()=>addItem(p)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between border-b border-slate-50">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-slate-400 text-xs">Stock: {p.stock} | ₹{p.purchasePrice}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      {items.length>0&&(
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50">
              {['Product','Qty','Purchase ₹','MRP ₹','Sell ₹','Batch','Expiry',''].map(h=>(
                <th key={h} className="px-3 py-2.5 text-xs font-semibold text-slate-500 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item,idx)=>(
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800 text-xs">{item.name}</p>
                    <p className="text-slate-400 text-xs">{item.sku}</p>
                  </td>
                  {['quantity','purchasePrice','mrp','sellingPrice','batchNumber'].map(f=>(
                    <td key={f} className="px-3 py-2">
                      <input type={['quantity','purchasePrice','mrp','sellingPrice'].includes(f)?'number':'text'}
                        value={item[f]} onChange={e=>updateItem(idx,f,e.target.value)}
                        className="input text-xs py-1 w-20"/>
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <input type="date" value={item.expiryDate} onChange={e=>updateItem(idx,'expiryDate',e.target.value)}
                      className="input text-xs py-1 w-32"/>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">{items.length} items</span>
            <span className="font-bold text-slate-800">{formatINR(total)}</span>
          </div>
        </div>
      )}

      <div className="card p-5">
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
          className="input text-sm resize-none" placeholder="Optional notes..."/>
      </div>

      <div className="flex gap-3">
        <button onClick={()=>navigate('/purchases')} className="btn-secondary">Cancel</button>
        <button onClick={submit} disabled={submitting||!items.length} className="btn-primary">
          <Save size={16}/>{submitting?'Saving...':'Save & Receive Stock'}
        </button>
      </div>
    </div>
  )
}
