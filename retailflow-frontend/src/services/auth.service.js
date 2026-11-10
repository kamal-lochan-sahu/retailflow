import api from './api.js'
import { useAuthStore } from '../store/authStore.js'

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword  = (token, password) => api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password })

export const fetchRegistrationStatus = () => api.get('/auth/registration-status')

// The refresh token identifies THIS device, so the server keeps it signed in and signs the others out.
export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', {
    currentPassword,
    newPassword,
    refreshToken: useAuthStore.getState().refreshToken || undefined,
  })
