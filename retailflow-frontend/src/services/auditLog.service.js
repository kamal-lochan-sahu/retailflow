import api from './api.js'

export const fetchAuditLogs = (params) => api.get('/audit-logs', { params })
