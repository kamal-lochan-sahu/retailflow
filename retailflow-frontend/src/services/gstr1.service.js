import api from './api.js'
export const fetchGSTR1 = (p) => api.get('/analytics/gstr1', { params: p })
