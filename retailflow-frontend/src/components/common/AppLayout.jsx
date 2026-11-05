import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import OfflineBanner from './OfflineBanner.jsx'
import { useUIStore } from '../../store/uiStore.js'

export default function AppLayout() {
  const open = useUIStore(s => s.sidebarOpen)
  const mobileNavOpen = useUIStore(s => s.mobileNavOpen)
  const setMobileNav = useUIStore(s => s.setMobileNav)
  const location = useLocation()
  // Below lg the sidebar is an off-canvas drawer: close it after every navigation.
  useEffect(() => { setMobileNav(false) }, [location.pathname, setMobileNav])
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {mobileNavOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileNav(false)} />}
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ml-0 ${open ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <OfflineBanner />
          {/* key=pathname remounts the boundary on navigation, so a crash on
              one page doesn't leave every page after it stuck showing the
              same fallback — sidebar/navbar stay interactive either way. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
