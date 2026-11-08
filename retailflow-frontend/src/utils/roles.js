// Where each role lands after login / when it opens a page it may not see.
export const LANDING = {
  owner:    '/',
  manager:  '/',
  cashier:  '/pos',
  stockboy: '/products',
  delivery: '/orders',
}
export const landingFor = (role) => LANDING[role] || '/pos'

export const MANAGER_UP = ['owner', 'manager']
