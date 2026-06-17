import { create } from 'zustand'

export const usePOSStore = create((set, get) => ({
  cart:         [],
  customer:     null,
  discount:     0,
  discountType: 'flat',
  holdBills:    [],

  addItem: (product, variant = null) => {
    const { cart } = get()
    const key = variant ? `${product._id}-${variant._id}` : product._id
    const existing = cart.find(i => i.key === key)

    if (existing) {
      set({ cart: cart.map(i => i.key === key
        ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.sellingPrice }
        : i)
      })
    } else {
      set({ cart: [...cart, {
        key,
        productId:    product._id,
        variantId:    variant?._id || null,
        name:         product.name + (variant ? ` (${Object.values(variant.attributes).filter(Boolean).join('/')})` : ''),
        barcode:      variant?.barcode || product.barcode,
        sku:          variant?.sku     || product.sku,
        sellingPrice: variant?.sellingPrice || product.sellingPrice,
        mrp:          variant?.mrp          || product.mrp,
        gstPercent:   product.gstPercent,
        unit:         product.unit,
        quantity:     1,
        discount:     0,
        discountType: 'flat',
        total:        variant?.sellingPrice || product.sellingPrice,
      }]})
    }
  },

  updateQty: (key, qty) => {
    if (qty <= 0) return get().removeItem(key)
    set({ cart: get().cart.map(i => i.key === key
      ? { ...i, quantity: qty, total: qty * i.sellingPrice - (i.discountType==='flat' ? i.discount : (qty*i.sellingPrice*i.discount/100)) }
      : i)
    })
  },

  updatePrice: (key, price) => set({
    cart: get().cart.map(i => i.key === key
      ? { ...i, sellingPrice: price, total: price * i.quantity }
      : i)
  }),

  removeItem: (key) => set({ cart: get().cart.filter(i => i.key !== key) }),

  clearCart: () => set({ cart: [], customer: null, discount: 0 }),

  setCustomer: (customer) => set({ customer }),

  setDiscount: (discount, type = 'flat') => set({ discount, discountType: type }),

  holdBill: () => {
    const { cart, customer, discount, discountType, holdBills } = get()
    if (!cart.length) return
    set({
      holdBills: [...holdBills, { id: Date.now(), cart, customer, discount, discountType, at: new Date() }],
      cart: [], customer: null, discount: 0
    })
  },

  resumeBill: (id) => {
    const { holdBills } = get()
    const bill = holdBills.find(b => b.id === id)
    if (!bill) return
    set({
      cart: bill.cart, customer: bill.customer,
      discount: bill.discount, discountType: bill.discountType,
      holdBills: holdBills.filter(b => b.id !== id)
    })
  },

  getSubtotal:   () => get().cart.reduce((s, i) => s + i.total, 0),
  getItemCount:  () => get().cart.reduce((s, i) => s + i.quantity, 0),
  getGSTAmount:  () => get().cart.reduce((s, i) => s + (i.total * i.gstPercent / 100), 0),

  getTotal: () => {
    const { discount, discountType } = get()
    const sub = get().getSubtotal()
    const gst = get().getGSTAmount()
    const disc = discountType === 'percent' ? (sub * discount / 100) : discount
    return Math.round(sub + gst - disc)
  }
}))
