import api from './api.js'

export const fetchStaff  = ()        => api.get('/staff')
export const getStaff    = (id)      => api.get(`/staff/${id}`)
export const createStaff = (data)    => api.post('/staff', data)
export const updateStaff = (id,data) => api.put(`/staff/${id}`, data)
export const deleteStaff = (id)      => api.delete(`/staff/${id}`)
