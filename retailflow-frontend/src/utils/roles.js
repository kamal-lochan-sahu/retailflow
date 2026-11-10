// Where each role lands after login / when it opens a page it may not see.
export const LANDING = {
  owner:    '/',
  manager:  '/',
  cashier:  '/pos',
  stockboy: '/products',
  delivery: '/orders',
}
export const landingFor = (role) => LANDING[role] || '/pos'

export const OWNER_ONLY = ['owner']
export const MANAGER_UP = ['owner', 'manager']
export const CASHIER_UP = ['owner', 'manager', 'cashier']             // can ring up sales
export const STOCK_UP   = ['owner', 'manager', 'cashier', 'stockboy'] // can see the product catalogue
