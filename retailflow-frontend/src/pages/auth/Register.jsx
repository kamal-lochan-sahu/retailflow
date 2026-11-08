import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { fetchRegistrationStatus } from '../../services/auth.service.js'

export default function Register() {
  const { login } = useAuthStore()
  const navigate  = useNavigate()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm()
  const [open, setOpen] = useState(null)   // null = still checking
  useEffect(() => { fetchRegistrationStatus().then(r => setOpen(!!r.data?.data?.open)).catch(() => setOpen(true)) }, [])

  const onSubmit = async (data) => {
    try {
      const res = await import('../../services/api.js').then(m => m.default.post('/auth/register', data))
      useAuthStore.getState().setToken(res.data.data.accessToken)
      useAuthStore.setState({ user: res.data.data.user, refreshToken: res.data.data.refreshToken })
      toast.success('Shop registered! Welcome 🎉')
      navigate('/')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <ShoppingCart className="text-white" size={20}/>
          </div>
          <h1 className="text-xl font-bold text-slate-800">RetailFlow</h1>
        </div>
        {open === false ? (
          <div className="text-center py-4">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Registration is closed</h2>
            <p className="text-sm text-slate-600 mb-6">Ask the shop owner to create your account, then sign in.</p>
            <Link to="/login" className="btn-primary px-5 py-2 inline-block">Go to sign in</Link>
          </div>
        ) : (<>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Register your shop</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name:'name',     label:'Your Name',  type:'text',     ph:'Full name' },
            { name:'shopName', label:'Shop Name',  type:'text',     ph:'Sharma General Store' },
            { name:'email',    label:'Email',      type:'email',    ph:'you@example.com' },
            { name:'phone',    label:'Phone',      type:'tel',      ph:'10-digit mobile' },
            { name:'password', label:'Password',   type:'password', ph:'Min 8 characters' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              <input {...register(f.name, { required: true })} type={f.type} className="input" placeholder={f.ph}/>
            </div>
          ))}
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
            {isSubmitting ? 'Creating shop...' : 'Create Shop'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600 mt-4">
          Already registered? <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
        </>)}
      </div>
    </div>
  )
}
