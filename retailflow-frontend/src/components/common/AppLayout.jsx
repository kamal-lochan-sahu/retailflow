import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import OfflineBanner from './OfflineBanner.jsx'
import { useUIStore } from '../../store/uiStore.js'

export default function AppLayout() {
  const open = useUIStore(s => s.sidebarOpen)
  const location = useLocation()
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ${open ? 'ml-64' : 'ml-16'}`}>
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
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
