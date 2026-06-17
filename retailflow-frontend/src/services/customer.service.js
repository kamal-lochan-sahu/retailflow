import api from './api.js'
export const fetchCustomers  = (params) => api.get('/customers', { params })
export const searchCustomers = (q)      => api.get('/customers/search', { params: { q } })
export const getCustomer     = (id)     => api.get(`/customers/${id}`)
export const createCustomer  = (data)   => api.post('/customers', data)
export const updateCustomer  = (id, d)  => api.put(`/customers/${id}`, d)
export const getHistory      = (id)     => api.get(`/customers/${id}/history`)
export const getDefaulters   = ()       => api.get('/customers/defaulters')
export const sendReminder    = (id)     => api.post(`/customers/${id}/remind`)
