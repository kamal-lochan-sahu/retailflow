import api from './api.js'

export const getCustomerLedger   = (customerId) => api.get(`/udhaar/customer/${customerId}`)
export const recordUdhaarPayment = (data)       => api.post('/udhaar/payment', data)
export const getUdhaarReport     = ()           => api.get('/udhaar/report')
