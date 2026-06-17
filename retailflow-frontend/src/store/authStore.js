import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api.js'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:        null,
      accessToken: null,
      settings:    null,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        set({ user: data.data.user, accessToken: data.data.accessToken })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`
        return data.data.user
      },

      logout: async () => {
        try { await api.post('/auth/logout') } catch {}
        set({ user: null, accessToken: null, settings: null })
        delete api.defaults.headers.common['Authorization']
      },

      setToken: (token) => {
        set({ accessToken: token })
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },

      setSettings: (settings) => set({ settings }),

      getShopName: () => {
        const { user, settings } = get()
        return settings?.shop?.name || user?.branding?.shopName || 'RetailFlow'
      },
    }),
    {
      name: 'retailflow-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
)
