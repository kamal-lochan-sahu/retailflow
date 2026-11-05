import api from './api.js'
export const createSaleReturn = (body) => api.post('/returns', body)
export const fetchSaleReturns = (saleId) => api.get('/returns', { params: { saleId } })
