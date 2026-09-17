import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchProducts, deleteProduct } from '../../services/product.service.js'
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../services/category.service.js'
import { formatINR } from '../../utils/formatCurrency.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import Modal from '../../components/common/Modal.jsx'
import { Plus, Search, AlertTriangle, Edit, Trash2, Package, Tag, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

function CategoryManager({ open, onClose }) {
  const qc = useQueryClient()
  const [newName, setNewName]     = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  fetchCategories,
    enabled:  open,
  })
  const categories = data?.data?.data || []

  const createMut = useMutation({
    mutationFn: (name) => createCategory({ name }),
    onSuccess: () => { toast.success('Category added'); setNewName(''); qc.invalidateQueries(['categories']) },
    onError:   (e)  => toast.error(e.response?.data?.message || 'Failed to add category')
  })
  const updateMut = useMutation({
    mutationFn: ({ id, name }) => updateCategory(id, { name }),
    onSuccess: () => {
      toast.success('Category updated'); setEditingId(null)
      qc.invalidateQueries(['categories']); qc.invalidateQueries(['products'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update category')
  })
  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Category deleted')
      qc.invalidateQueries(['categories']); qc.invalidateQueries(['products'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete category')
  })

  const submitNew = (e) => {
    e.preventDefault()
    if (newName.trim()) createMut.mutate(newName.trim())
  }
  const saveEdit = () => {
    if (editName.trim()) updateMut.mutate({ id: editingId, name: editName.trim() })
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Categories" size="sm">
      <div className="p-6 space-y-4">
        <form onSubmit={submitNew} className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="New category name" className="input text-sm flex-1"/>
          <button type="submit" disabled={!newName.trim() || createMut.isPending} className="btn-primary text-sm px-3">
            <Plus size={14}/>
          </button>
        </form>

        <div className="max-h-72 overflow-y-auto space-y-1">
          {isLoading && <p className="text-sm text-slate-400 text-center py-4">Loading...</p>}
          {!isLoading && categories.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No categories yet — add one above.</p>
          )}
          {categories.map(c => (
            <div key={c._id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-slate-50">
              {editingId === c._id ? (
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                  className="input text-sm flex-1 py-1"/>
              ) : (
                <span className="text-sm text-slate-700">{c.name}</span>
              )}
              <div className="flex gap-1 flex-shrink-0">
                {editingId === c._id ? (
                  <>
                    <button onClick={saveEdit} className="btn-ghost p-1.5 text-green-600 hover:text-green-700"><Check size={14}/></button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost p-1.5 text-slate-400"><X size={14}/></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(c._id); setEditName(c.name) }}
                      className="btn-ghost p-1.5 text-slate-400 hover:text-brand-600"><Edit size={14}/></button>
                    <button onClick={() => deleteMut.mutate(c._id)}
                      className="btn-ghost p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default function Products() {
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [catOpen, setCatOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => fetchProducts({ page, search, limit: 20 }),
  })

  const del = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries(['products']) }
  })

  if (isLoading) return <PageLoader/>

  const products    = data?.data?.data?.products || []
  const pagination  = data?.data?.data?.pagination || {}

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Products</h1>
        <div className="flex gap-2">
          <Link to="/products/low-stock" className="btn-secondary text-sm">
            <AlertTriangle size={14} className="text-yellow-500"/> Low Stock
          </Link>
          <button onClick={() => setCatOpen(true)} className="btn-secondary text-sm">
            <Tag size={14}/> Categories
          </button>
          <Link to="/products/add" className="btn-primary text-sm">
            <Plus size={14}/> Add Product
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="input pl-9 text-sm" placeholder="Search products..."/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left">
              {['Product','SKU','Category','MRP','Price','Stock','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(p => {
                const stockStatus = p.stock === 0 ? 'out' : p.stock <= p.minStock ? 'low' : 'ok'
                return (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover rounded-lg"/> : <Package size={16} className="text-slate-400"/>}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 truncate max-w-[180px]">{p.name}</p>
                          {p.barcode && <p className="text-xs text-slate-400">{p.barcode}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 text-slate-500">{p.category?.name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatINR(p.mrp)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatINR(p.sellingPrice)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${stockStatus==='out'?'text-red-600':stockStatus==='low'?'text-yellow-600':'text-green-600'}`}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge-${stockStatus==='out'?'red':stockStatus==='low'?'yellow':'green'}`}>
                        {stockStatus==='out'?'Out of stock':stockStatus==='low'?'Low stock':'In stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/products/${p._id}/edit`} className="btn-ghost p-1.5 text-slate-400 hover:text-brand-600"><Edit size={14}/></Link>
                        <button onClick={() => del.mutate(p._id)} className="btn-ghost p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Package size={40} className="mx-auto mb-3 opacity-30"/>
              <p>No products found</p>
              <Link to="/products/add" className="btn-primary mt-4 inline-flex text-sm">Add your first product</Link>
            </div>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">Showing {products.length} of {pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={() => setPage(p => p-1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
              <button disabled={page===pagination.pages} onClick={() => setPage(p => p+1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <CategoryManager open={catOpen} onClose={() => setCatOpen(false)}/>
    </div>
  )
}
