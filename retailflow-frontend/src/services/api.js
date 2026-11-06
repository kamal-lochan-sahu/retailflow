import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api',
  withCredentials: true,
})

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// One refresh at a time: when several requests 401 together they share a single refresh call.
// (The refresh token travels in the body — the API is on another domain, so a cookie can't be relied on.)
let refreshing = null
let loggingOut = false
function refreshAccessToken() {
  if (!refreshing) {
    const stored = useAuthStore.getState().refreshToken
    refreshing = api.post('/auth/refresh-token', { refreshToken: stored })
      .then(({ data }) => {
        const { accessToken, refreshToken: rotated } = data.data
        useAuthStore.getState().setToken(accessToken)
        if (rotated) useAuthStore.setState({ refreshToken: rotated })
        return accessToken
      })
      .finally(() => { refreshing = null })
  }
  return refreshing
}

// Auto refresh on 401
api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh-token') || original.url?.includes('/auth/logout')
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint && !loggingOut) {
      original._retry = true
      try {
        const current = useAuthStore.getState().accessToken
        // a sibling request may already have refreshed while this one was in flight: just retry with the new token
        const accessToken = (current && original.headers?.Authorization !== `Bearer ${current}`) ? current : await refreshAccessToken()
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch (refreshErr) {
        // No response at all = offline / server unreachable. That's not a dead
        // session — don't log the cashier out mid-shift.
        if (!refreshErr.response) return Promise.reject(error)
        // several requests can fail together: sign out (and redirect) only once
        if (!loggingOut) {
          loggingOut = true
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      }
    }
    const msg = error.response?.data?.message || 'Something went wrong'
    // `silent` = background calls (offline sync/cache refresh); and no toast while offline.
    if (error.response?.status !== 401 && !original.silent && (error.response || navigator.onLine)) toast.error(msg)
    return Promise.reject(error)
  }
)

export default api
