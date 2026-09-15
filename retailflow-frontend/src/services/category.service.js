import api from './api.js'

export const fetchCategories = ()        => api.get('/categories')
export const fetchCategory   = (id)      => api.get(`/categories/${id}`)
export const createCategory  = (data)    => api.post('/categories', data)
export const updateCategory  = (id, data)=> api.put(`/categories/${id}`, data)
export const deleteCategory  = (id)      => api.delete(`/categories/${id}`)
