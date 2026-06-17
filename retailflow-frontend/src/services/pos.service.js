import api from './api.js'

export const createSale  = (data)   => api.post('/sales', data)
export const getBillPDF  = (saleId) => api.get(`/sales/${saleId}/bill`, { responseType: 'blob' })
export const holdBill    = (data)   => Promise.resolve(data)
export const getDailySummary = (date) => api.get('/sales/summary', { params: { date } })
