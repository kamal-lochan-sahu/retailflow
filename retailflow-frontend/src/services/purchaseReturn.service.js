import api from './api.js'

export const createPurchaseReturn = (data) => api.post('/purchase-returns', data)
export const fetchPurchaseReturns = ()     => api.get('/purchase-returns')
