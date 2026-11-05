import { create } from 'zustand'
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  mobileNavOpen: false,
  setMobileNav: (v) => set({ mobileNavOpen: v }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (v) => set({ sidebarOpen: v }),
}))
