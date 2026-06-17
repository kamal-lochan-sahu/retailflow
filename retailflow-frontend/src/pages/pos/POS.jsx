import { useState, useRef, useEffect } from 'react'
import { usePOSStore } from '../../store/posStore.js'
import { searchProducts, searchByBarcode } from '../../services/product.service.js'
import { createSale } from '../../services/pos.service.js'
import { formatINR } from '../../utils/formatCurrency.js'
import { useQuery } from '@tanstack/react-query'
import Modal from '../../components/common/Modal.jsx'
import { searchCustomers } from '../../services/customer.service.js'
import toast from 'react-hot-toast'
import { Search, Barcode, Plus, Minus, X, ShoppingCart, User, Tag, Clock } from 'lucide-react'

export default function POS() {
  const [search, setSearch]         = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers]   = useState([])
  const [payMode, setPayMode]       = useState('cash')
  const [cashTendered, setCash]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { cart, customer, addItem, updateQty, removeItem,
          setCustomer, holdBill, holdBills, resumeBill,
          getSubtotal, getTotal, getGSTAmount, discount,
          discountType, setDiscount, clearCart } = usePOSStore()

  const searchRef = useRef(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  const handleSearch = async (q) => {
    setSearch(q)
    if (!q.trim()) return setResults([])
    setSearching(true)
    try {
      const { data } = await searchProducts(q)
      setResults(data.data.products || [])
    } catch {} finally { setSearching(false) }
  }

  const handleBarcode = async (e) => {
    if (e.key !== 'Enter') return
    try {
      const { data } = await searchByBarcode(search.trim())
      addItem(data.data.product, data.data.variant)
      setSearch('')
      setResults([])
      toast.success(`Added: ${data.data.product.name}`)
    } catch {
      toast.error('Product not found for this barcode')
    }
  }

  const searchCustomerFn = async (q) => {
    setCustomerSearch(q)
    if (!q.trim()) return setCustomers([])
    const { data } = await searchCustomers(q)
    setCustomers(data.data || [])
  }

  const handleCheckout = async () => {
    if (!cart.length) return toast.error('Cart is empty')
    setSubmitting(true)
    try {
      await createSale({
        items: cart.map(i => ({
          productId:    i.productId,
          variantId:    i.variantId,
          quantity:     i.quantity,
          sellingPrice: i.sellingPrice,
          discount:     i.discount,
          discountType: i.discountType,
        })),
        customerId:     customer?._id,
        paymentMode:    payMode,
        payments:       [{ mode: payMode, amount: getTotal() }],
        discountAmount: discount,
        discountType,
        sendWhatsApp:   !!(customer?.phone),
      })
      clearCart()
      setShowPayment(false)
      toast.success('✅ Sale completed!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Sale failed')
    } finally { setSubmitting(false) }
  }

  const subtotal = getSubtotal()
  const gst      = getGSTAmount()
  const total    = getTotal()
  const change   = cashTendered ? parseFloat(cashTendered) - total : 0

  return (
    <div className="h-full flex gap-4 -m-6 p-6 min-h-[calc(100vh-5rem)]">

      {/* LEFT — Product Search */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="card p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input
              ref={searchRef}
              value={search}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={handleBarcode}
              className="input pl-9 pr-4"
              placeholder="Search product name or scan barcode (Enter)..."
            />
          </div>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="card overflow-hidden mb-4">
            {results.map(p => (
              <button key={p._id} onClick={() => { addItem(p); setSearch(''); setResults([]) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-left transition">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl">
                  {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover rounded-lg"/> : '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.sku} • Stock: {p.stock} {p.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{formatINR(p.sellingPrice)}</p>
                  {p.mrp > p.sellingPrice && <p className="text-xs text-slate-400 line-through">{formatINR(p.mrp)}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Hold Bills */}
        {holdBills.length > 0 && (
          <div className="card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-orange-500"/>
              <span className="text-sm font-medium text-slate-700">Hold Bills ({holdBills.length})</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {holdBills.map(b => (
                <button key={b.id} onClick={() => resumeBill(b.id)}
                  className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition">
                  Bill #{String(b.id).slice(-4)} — ₹{b.cart.reduce((s,i) => s+i.total,0).toFixed(0)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Customer Search */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-slate-500"/>
            <span className="text-sm font-medium text-slate-700">Customer (optional)</span>
          </div>
          {customer ? (
            <div className="flex items-center gap-3 bg-brand-50 rounded-lg p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-800">{customer.name}</p>
                <p className="text-xs text-brand-600">{customer.phone} • Points: {customer.loyaltyPoints}</p>
              </div>
              <button onClick={() => setCustomer(null)} className="text-brand-400 hover:text-brand-600"><X size={16}/></button>
            </div>
          ) : (
            <div className="relative">
              <input value={customerSearch} onChange={e => searchCustomerFn(e.target.value)}
                className="input text-sm" placeholder="Search by name or phone..."/>
              {customers.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                  {customers.map(c => (
                    <button key={c._id} onClick={() => { setCustomer(c); setCustomerSearch(''); setCustomers([]) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between">
                      <span>{c.name}</span>
                      <span className="text-xs text-slate-400">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart */}
      <div className="w-80 lg:w-96 flex flex-col card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <ShoppingCart size={16} className="text-brand-600"/>
          <span className="font-semibold text-slate-800">Cart</span>
          {cart.length > 0 && <span className="ml-auto text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{cart.length} items</span>}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 py-16">
              <ShoppingCart size={40} className="mb-3"/>
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Search or scan products</p>
            </div>
          ) : cart.map(item => (
            <div key={item.key} className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-start gap-2 mb-2">
                <p className="flex-1 text-sm font-medium text-slate-800 leading-tight">{item.name}</p>
                <button onClick={() => removeItem(item.key)} className="text-slate-300 hover:text-red-400 mt-0.5"><X size={14}/></button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg">
                  <button onClick={() => updateQty(item.key, item.quantity - 1)} className="p-1.5 hover:bg-slate-50 rounded-l-lg"><Minus size={12}/></button>
                  <input
                    type="number" value={item.quantity} min="0.01" step="any"
                    onChange={e => updateQty(item.key, parseFloat(e.target.value) || 0)}
                    className="w-10 text-center text-sm font-medium border-0 outline-none bg-transparent"
                  />
                  <button onClick={() => updateQty(item.key, item.quantity + 1)} className="p-1.5 hover:bg-slate-50 rounded-r-lg"><Plus size={12}/></button>
                </div>
                <span className="text-xs text-slate-500">{item.unit}</span>
                <span className="ml-auto text-sm font-bold text-slate-800">{formatINR(item.total)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t border-slate-100 p-4 space-y-3">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400"/>
              <input
                type="number" placeholder="Discount" min="0"
                value={discount || ''}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="input text-sm flex-1 py-1.5"
              />
              <select value={discountType} onChange={e => setDiscount(discount, e.target.value)}
                className="input text-sm w-20 py-1.5">
                <option value="flat">₹</option>
                <option value="percent">%</option>
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span><span>{formatINR(subtotal)}</span>
              </div>
              {gst > 0 && <div className="flex justify-between text-slate-600">
                <span>GST</span><span>{formatINR(gst)}</span>
              </div>}
              {discount > 0 && <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatINR(discountType==='percent' ? subtotal*discount/100 : discount)}</span>
              </div>}
              <div className="flex justify-between font-bold text-base text-slate-800 pt-1 border-t border-slate-100">
                <span>Total</span><span>{formatINR(total)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={holdBill} className="btn-secondary flex-1 text-xs">Hold</button>
              <button onClick={() => setShowPayment(true)} className="btn-primary flex-1">
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Payment" size="sm">
        <div className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-sm text-slate-500">Total Amount</p>
            <p className="text-4xl font-bold text-slate-800">{formatINR(total)}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Payment Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {[{v:'cash',l:'💵 Cash'},{v:'upi',l:'📱 UPI'},{v:'card',l:'💳 Card'},{v:'credit',l:'📋 Udhaar'}].map(({v,l}) => (
                <button key={v} onClick={() => setPayMode(v)}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition ${payMode===v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {payMode === 'cash' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Cash Tendered</label>
              <input type="number" value={cashTendered} onChange={e => setCash(e.target.value)}
                className="input text-lg font-semibold" placeholder="0.00"/>
              {cashTendered && (
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-slate-500">Change</span>
                  <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatINR(change)}</span>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                {[500,1000,2000].map(amt => (
                  <button key={amt} onClick={() => setCash(String(amt))}
                    className="flex-1 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">₹{amt}</button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleCheckout} disabled={submitting}
            className="btn-primary w-full py-3 text-base">
            {submitting ? 'Processing...' : `Confirm Payment ${formatINR(total)}`}
          </button>
        </div>
      </Modal>
    </div>
  )
}
