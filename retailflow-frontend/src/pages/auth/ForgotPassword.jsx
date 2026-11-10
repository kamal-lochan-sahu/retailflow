import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import AuthShell from './AuthShell.jsx'
import { forgotPassword } from '../../services/auth.service.js'

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async ({ email }) => {
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong, try again')
    }
  }

  return (
    <AuthShell title="Forgot password">
      {sent ? (
        <p className="text-sm text-slate-600">
          If that email is registered, a reset link is on its way. It is valid for 1 hour. Check your spam folder too.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-slate-500">Enter your login email and we will send you a link to set a new password.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input {...register('email', { required: 'Email required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Valid email required' } })}
                   type="email" className="input" placeholder="you@example.com" autoComplete="email"/>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
          <p className="text-xs text-slate-500">Staff: if you have no email access, ask the shop owner to reset your account.</p>
        </form>
      )}
    </AuthShell>
  )
}
