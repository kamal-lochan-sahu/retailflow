import { Bell, LogOut, User, Menu } from 'lucide-react'
import { useUIStore } from '../../store/uiStore.js'
import { useAuthStore } from '../../store/authStore.js'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const mobileNavOpen = useUIStore(s => s.mobileNavOpen)
  const setMobileNav = useUIStore(s => s.setMobileNav)
  const toggleMobileNav = () => setMobileNav(!mobileNavOpen)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <button onClick={toggleMobileNav} className="btn-ghost p-2 rounded-lg lg:hidden" aria-label="Open menu"><Menu size={20}/></button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <button className="relative btn-ghost p-2 rounded-lg">
          <Bell size={18}/>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
          <Link to="/account" title="My account / change password" className="flex items-center gap-2 rounded-lg hover:bg-slate-50 p-1 -m-1">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <User size={16} className="text-brand-600"/>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-800 leading-none">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </Link>
          <button onClick={handleLogout} className="btn-ghost p-2 ml-1 text-red-500 hover:bg-red-50 rounded-lg">
            <LogOut size={16}/>
          </button>
        </div>
      </div>
    </header>
  )
}
