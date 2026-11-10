import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

export default function AuthShell({ title, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <ShoppingCart className="text-white" size={20}/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{import.meta.env.VITE_SHOP_NAME || 'RetailFlow'}</h1>
            <p className="text-xs text-slate-500">Retail Management System</p>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">{title}</h2>
        {children}
        <p className="text-center text-sm text-slate-600 mt-6">
          <Link to="/login" className="text-brand-600 font-medium hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
