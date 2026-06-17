import api from './api.js'

export const fetchProducts   = (params) => api.get('/products', { params })
export const fetchProduct    = (id)     => api.get(`/products/${id}`)
export const searchByBarcode = (code)   => api.get(`/products/barcode/${code}`)
export const searchProducts  = (q)      => api.get('/products', { params: { search: q, limit: 10 } })
export const createProduct   = (data)   => api.post('/products', data)
export const updateProduct   = (id, data) => api.put(`/products/${id}`, data)
export const deleteProduct   = (id)     => api.delete(`/products/${id}`)
export const getLowStock     = ()       => api.get('/products/low-stock')
export const getExpiring     = (days)   => api.get('/products/expiring', { params: { days } })
export const bulkImport      = (file)   => {
  const fd = new FormData(); fd.append('file', file)
  return api.post('/products/bulk-import', fd)
}
