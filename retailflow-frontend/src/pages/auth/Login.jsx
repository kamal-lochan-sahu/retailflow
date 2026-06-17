import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ShoppingCart, Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})

export default function Login() {
  const { login } = useAuthStore()
  const navigate  = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Login failed')
    }
  }

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

        <h2 className="text-2xl font-bold text-slate-800 mb-6">Sign in</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input {...register('email')} type="email" className="input" placeholder="you@example.com"/>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input {...register('password')} type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"/>
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          New shop? <Link to="/register" className="text-brand-600 font-medium hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  )
}
