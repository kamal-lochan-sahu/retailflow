import api from './api.js'
export const fetchDashboard = () => api.get('/analytics/dashboard')
export const fetchSales     = (p) => api.get('/analytics/sales', { params: p })
export const fetchProfit    = (p) => api.get('/analytics/profit', { params: p })
export const fetchGST       = (p) => api.get('/analytics/gst',    { params: p })
export const exportReport   = (p) => api.get('/analytics/export', { params: p, responseType: 'blob' })
