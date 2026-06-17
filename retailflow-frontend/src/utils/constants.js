export const PAYMENT_MODES = [
  { value: 'cash',   label: 'Cash',   color: 'green'  },
  { value: 'upi',    label: 'UPI',    color: 'blue'   },
  { value: 'card',   label: 'Card',   color: 'purple' },
  { value: 'credit', label: 'Udhaar', color: 'red'    },
  { value: 'split',  label: 'Split',  color: 'orange' },
]

export const UNITS = ['piece','kg','gram','litre','ml','dozen','box','packet']

export const GST_SLABS = [0, 5, 12, 18, 28]

export const CUSTOMER_TYPES = [
  { value:'regular',   label:'Regular'   },
  { value:'wholesale', label:'Wholesale' },
  { value:'vip',       label:'VIP'       },
  { value:'defaulter', label:'Defaulter' },
]

export const ROLES = {
  owner:    'Owner',
  manager:  'Manager',
  cashier:  'Cashier',
  stockboy: 'Stock Boy',
  delivery: 'Delivery',
}
