import { Bell, LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div />
      <div className="flex items-center gap-3">
        <button className="relative btn-ghost p-2 rounded-lg">
          <Bell size={18}/>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
            <User size={16} className="text-brand-600"/>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-none">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost p-2 ml-1 text-red-500 hover:bg-red-50 rounded-lg">
            <LogOut size={16}/>
          </button>
        </div>
      </div>
    </header>
  )
}
